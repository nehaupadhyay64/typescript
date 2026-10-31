import express from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import multer from 'multer';
import { config } from './config.js';
import { pool } from './db.js';
import { emailQueue } from './queue.js';
import { indexEmail, searchEmails } from './es.js';
export const router = express.Router();
const upload = multer();
const auth = (req, res, next) => {
    const raw = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    try {
        if (!raw)
            throw new Error('Missing token');
        req.user = jwt.verify(raw, config.jwtSecret);
        next();
    }
    catch {
        res.status(401).json({ error: 'Unauthorized' });
    }
};
const sign = (row) => jwt.sign({ id: row.id, email: row.email, name: row.name, avatar: row.avatar }, config.jwtSecret, { expiresIn: '7d' });
router.get('/auth/config', (_req, res) => res.json({ googleConfigured: Boolean(config.googleClientId && config.googleClientSecret && config.googleRedirectUri), localDemoEnabled: config.localDemoEnabled, slackConfigured: Boolean(config.slackClientId && config.slackClientSecret), etherealConfigured: Boolean(config.etherealUser && config.etherealPass) }));
router.get('/auth/demo', async (req, res) => {
    if (!config.localDemoEnabled)
        return res.status(404).json({ error: 'Local demo authentication is disabled' });
    const host = req.hostname.toLowerCase();
    if (!['localhost', '127.0.0.1', '::1'].includes(host) && !host.endsWith('.localhost'))
        return res.status(403).json({ error: 'Local demo authentication is only available locally' });
    const result = await pool.query(`INSERT INTO users(email,name,avatar,google_sub) VALUES($1,$2,$3,$4)
    ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,avatar=EXCLUDED.avatar RETURNING *`, ['demo@reachinbox.local', 'ReachInbox Demo', null, 'local-demo']);
    const user = result.rows[0];
    res.json({ token: sign(user), demo: true, user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar } });
});
router.get('/auth/google', (_req, res) => {
    if (!config.googleClientId)
        return res.status(503).json({ error: 'Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env.' });
    const params = new URLSearchParams({ client_id: config.googleClientId, redirect_uri: config.googleRedirectUri, response_type: 'code', scope: 'openid email profile', access_type: 'online' });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});
router.get('/auth/google/callback', async (req, res) => {
    try {
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({ code: String(req.query.code || ''), client_id: config.googleClientId, client_secret: config.googleClientSecret, redirect_uri: config.googleRedirectUri, grant_type: 'authorization_code' }));
        const profile = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + tokenResponse.data.access_token } });
        const data = profile.data;
        const result = await pool.query(`INSERT INTO users(email,name,avatar,google_sub) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,avatar=EXCLUDED.avatar RETURNING *`, [data.email, data.name, data.picture, data.sub]);
        res.redirect(`${config.frontendUrl}/auth/callback?token=${sign(result.rows[0])}`);
    }
    catch (error) {
        res.status(502).json({ error: 'Google OAuth failed', detail: error.response?.data || error.message });
    }
});
router.get('/me', auth, async (req, res) => { const r = await pool.query('SELECT id,email,name,avatar FROM users WHERE id=$1', [req.user.id]); res.json(r.rows[0]); });
router.get('/integrations', auth, async (req, res) => { const r = await pool.query('SELECT google_sub IS NOT NULL AS google_connected, slack_webhook IS NOT NULL AS slack_connected FROM users WHERE id=$1', [req.user.id]); res.json({ ...r.rows[0], googleConfigured: Boolean(config.googleClientId), slackConfigured: Boolean(config.slackClientId) }); });
router.get('/emails', auth, async (req, res) => { const r = await pool.query('SELECT * FROM emails WHERE tenant_id=$1 ORDER BY created_at DESC', [req.user.id]); res.json(r.rows); });
router.get('/emails/search', auth, async (req, res) => res.json(await searchEmails(String(req.query.q || ''), req.user.id)));
router.post('/emails/schedule', auth, async (req, res) => {
    const { recipient, sender, subject, body, scheduledAt, delayMs = 0, hourlyLimit } = req.body;
    if (!recipient || !sender || !subject || !body || !scheduledAt)
        return res.status(400).json({ error: 'recipient, sender, subject, body, and scheduledAt are required' });
    const scheduled = new Date(scheduledAt);
    if (Number.isNaN(scheduled.valueOf()) || scheduled.valueOf() <= Date.now())
        return res.status(400).json({ error: 'Start time must be in the future' });
    const r = await pool.query(`INSERT INTO emails(tenant_id,recipient,sender,subject,body,scheduled_at,hourly_limit) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [req.user.id, recipient, sender, subject, body, scheduled, Number(hourlyLimit) || null]);
    await emailQueue.add('email', { emailId: r.rows[0].id, tenantId: req.user.id, recipient, sender, subject, body, hourlyLimit: Number(hourlyLimit) || undefined, delayMs: Number(delayMs) || 0 }, { jobId: `email-${r.rows[0].id}`, delay: scheduled.valueOf() - Date.now() });
    await indexEmail({ ...r.rows[0], tenantId: req.user.id });
    res.status(201).json(r.rows[0]);
});
router.post('/emails/bulk', auth, upload.single('leads'), async (req, res) => {
    const file = req.file;
    if (!file)
        return res.status(400).json({ error: 'Upload a CSV or TXT file containing leads' });
    const candidates = file.buffer.toString('utf8').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    const recipients = [...new Set(candidates.map(v => v.toLowerCase()))];
    if (!recipients.length)
        return res.status(400).json({ error: 'No valid email addresses found in the uploaded file' });
    const { subject, body, sender, scheduledAt, delayMs = '2000', hourlyLimit } = req.body;
    if (!subject || !body || !sender || !scheduledAt)
        return res.status(400).json({ error: 'sender, subject, body, and start time are required' });
    const base = new Date(scheduledAt).valueOf();
    if (!Number.isFinite(base) || base <= Date.now())
        return res.status(400).json({ error: 'Start time must be in the future' });
    const rows = [];
    for (let i = 0; i < recipients.length; i++) {
        const scheduled = new Date(base + i * Number(delayMs || 0));
        const r = await pool.query(`INSERT INTO emails(tenant_id,recipient,sender,subject,body,scheduled_at,hourly_limit) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [req.user.id, recipients[i], sender, subject, body, scheduled, Number(hourlyLimit) || null]);
        await emailQueue.add('email', { emailId: r.rows[0].id, tenantId: req.user.id, recipient: recipients[i], sender, subject, body, hourlyLimit: Number(hourlyLimit) || undefined, delayMs: Number(delayMs) || 0 }, { jobId: `email-${r.rows[0].id}`, delay: Math.max(0, scheduled.valueOf() - Date.now()) });
        rows.push(r.rows[0]);
    }
    res.status(201).json({ count: rows.length, emails: rows });
});
router.post('/emails/:id/retry', auth, async (req, res) => { const r = await pool.query(`UPDATE emails SET status='scheduled',error=NULL,sent_at=NULL WHERE id=$1 AND tenant_id=$2 RETURNING *`, [req.params.id, req.user.id]); if (!r.rows.length)
    return res.status(404).json({ error: 'Email not found' }); await emailQueue.add('email', { emailId: r.rows[0].id, tenantId: req.user.id, recipient: r.rows[0].recipient, sender: r.rows[0].sender, subject: r.rows[0].subject, body: r.rows[0].body, hourlyLimit: r.rows[0].hourly_limit || undefined }, { jobId: `email-${r.rows[0].id}-retry-${Date.now()}`, delay: 0 }); res.json(r.rows[0]); });
router.get('/slack/connect', auth, (req, res) => { if (!config.slackClientId)
    return res.status(503).json({ error: 'Slack OAuth is not configured. Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in backend/.env.' }); const token = req.headers.authorization?.replace(/^Bearer\s+/i, ''); const params = new URLSearchParams({ client_id: config.slackClientId, scope: 'incoming-webhook', redirect_uri: config.slackRedirectUri, state: token || '' }); res.redirect(`https://slack.com/oauth/v2/authorize?${params}`); });
router.get('/slack/callback', async (req, res) => { try {
    const response = await axios.post('https://slack.com/api/oauth.v2.access', new URLSearchParams({ client_id: config.slackClientId, client_secret: config.slackClientSecret, code: String(req.query.code || ''), redirect_uri: config.slackRedirectUri }));
    if (!response.data.ok)
        throw new Error(response.data.error);
    const user = jwt.verify(String(req.query.state || ''), config.jwtSecret);
    await pool.query('UPDATE users SET slack_webhook=$1 WHERE id=$2', [response.data.incoming_webhook.url, user.id]);
    res.redirect(`${config.frontendUrl}/dashboard?slack=connected`);
}
catch (error) {
    res.status(502).json({ error: 'Slack OAuth failed', detail: error.response?.data || error.message });
} });
router.post('/slack/disconnect', auth, async (req, res) => { await pool.query('UPDATE users SET slack_webhook=NULL WHERE id=$1', [req.user.id]); res.json({ connected: false }); });
router.get('/slack/status', auth, async (req, res) => { const r = await pool.query('SELECT slack_webhook IS NOT NULL connected FROM users WHERE id=$1', [req.user.id]); res.json({ ...r.rows[0], configured: Boolean(config.slackClientId) }); });
