import pg from 'pg';
import { config } from './config.js';
export const pool = new pg.Pool({ connectionString: config.databaseUrl });
export async function migrate() {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email TEXT UNIQUE NOT NULL, name TEXT, avatar TEXT, google_sub TEXT UNIQUE, slack_webhook TEXT, created_at TIMESTAMPTZ DEFAULT now());
  CREATE TABLE IF NOT EXISTS emails (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES users(id) ON DELETE CASCADE, recipient TEXT NOT NULL, sender TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, scheduled_at TIMESTAMPTZ NOT NULL, sent_at TIMESTAMPTZ, status TEXT NOT NULL DEFAULT 'scheduled', error TEXT, created_at TIMESTAMPTZ DEFAULT now());
  ALTER TABLE emails ADD COLUMN IF NOT EXISTS hourly_limit INTEGER;
  ALTER TABLE emails ADD COLUMN IF NOT EXISTS delay_ms INTEGER;
  CREATE INDEX IF NOT EXISTS idx_emails_tenant_status ON emails(tenant_id,status);`);
}
