import { Queue, QueueEvents } from 'bullmq'; import { Redis } from 'ioredis'; import { config } from './config.js';
export const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
export const emailQueue = new Queue('reachinbox-emails', { connection });
export const queueEvents = new QueueEvents('reachinbox-emails', { connection: new Redis(config.redisUrl, { maxRetriesPerRequest: null }) });
export interface EmailJob { emailId: string; tenantId: string; recipient: string; sender: string; subject: string; body: string; hourlyLimit?: number; delayMs?: number; }
