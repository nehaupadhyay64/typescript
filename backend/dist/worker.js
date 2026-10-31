import { createTransport, createTestAccount } from 'nodemailer';
import axios from 'axios';
import { Worker } from 'bullmq';
import { connection, emailQueue } from './queue.js';
import { config } from './config.js';
import { pool } from './db.js';
import { indexEmail } from './es.js';
let transporter;
async function smtp() {
    if (!transporter) {
        if (!config.etherealUser) {
            const account = await createTestAccount();
            config.etherealUser = account.user;
            config.etherealPass = account.pass;
            console.log(`Ethereal account created. Preview: https://ethereal.email/login; user=${account.user}`);
        }
        transporter = createTransport({ host: config.etherealHost, port: config.etherealPort, secure: false, auth: { user: config.etherealUser, pass: config.etherealPass } });
    }
    return transporter;
}
async function hourlyAllowed(sender, limit, tenant) {
    const hour = new Date().toISOString().slice(0, 13), key = `email-rate:${sender}:${hour}`;
    const count = await connection.incr(key);
    if (count === 1)
        await connection.expire(key, 3660);
    if (count <= limit)
        return true;
    const notifiedKey = `email-rate-notified:${sender}:${hour}`;
    if (await connection.set(notifiedKey, '1', 'EX', 3660, 'NX')) {
        const r = await pool.query('SELECT slack_webhook FROM users WHERE id=$1', [tenant]);
        if (r.rows[0]?.slack_webhook)
            await axios.post(r.rows[0].slack_webhook, { text: `Hourly limit reached for ${sender}. Queued emails will resume in the next hour window.` }).catch(() => undefined);
    }
    return false;
}
const worker = new Worker('reachinbox-emails', async (job) => {
    await new Promise(resolve => setTimeout(resolve, job.data.delayMs || config.delayMs));
    const status = await pool.query('SELECT status FROM emails WHERE id=$1', [job.data.emailId]);
    if (status.rows[0]?.status === 'sent')
        return { duplicate: false };
    const limit = job.data.hourlyLimit || config.hourlyLimit;
    if (!await hourlyAllowed(job.data.sender, limit, job.data.tenantId)) {
        const nextHour = new Date();
        nextHour.setUTCMinutes(0, 0, 0);
        nextHour.setUTCHours(nextHour.getUTCHours() + 1);
        await emailQueue.add('email', job.data, { jobId: `email-${job.data.emailId}`, delay: Math.max(1000, nextHour.valueOf() - Date.now()) });
        return { rescheduled: true };
    }
    try {
        const info = await (await smtp()).sendMail({ from: job.data.sender, to: job.data.recipient, subject: job.data.subject, text: job.data.body, html: `<div style="white-space:pre-wrap;font-family:sans-serif">${job.data.body}</div>` });
        const sentAt = new Date();
        await pool.query("UPDATE emails SET status='sent',sent_at=$1,error=NULL WHERE id=$2", [sentAt, job.data.emailId]);
        await indexEmail({ ...job.data, id: job.data.emailId, status: 'sent', sent_at: sentAt.toISOString() });
        return { messageId: info.messageId };
    }
    catch (error) {
        await pool.query("UPDATE emails SET status='failed',error=$1 WHERE id=$2", [error.message, job.data.emailId]);
        throw error;
    }
}, { connection, concurrency: config.concurrency, limiter: { max: config.hourlyLimit, duration: 3600000 } });
worker.on('failed', (job, error) => { if (job)
    pool.query("UPDATE emails SET status='failed',error=$1 WHERE id=$2", [error.message, job.data.emailId]).catch(() => undefined); });
console.log(`ReachInbox worker started (concurrency=${config.concurrency}, delay=${config.delayMs}ms)`);
