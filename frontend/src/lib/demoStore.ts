import type { EmailRecord } from '../types/email';

export type DemoCampaign = { id: string; name: string; recipient: string; subject: string; body: string; status: 'draft' | 'scheduled' | 'sent'; sent: number; opened: number; failed: number; scheduledAt?: string; createdAt: string };

const EMAILS_KEY = 'reachinbox_demo_emails';
const CAMPAIGNS_KEY = 'reachinbox_demo_campaigns';
const now = Date.now();
const future = (hours: number) => new Date(now + hours * 3600000).toISOString();
const past = (hours: number) => new Date(now - hours * 3600000).toISOString();

export const seedEmails: EmailRecord[] = [
  { id: 'demo-1', recipient: 'maya@example.com', sender: 'demo@reachinbox.ai', subject: 'Product launch follow-up', body: 'A quick follow-up about our new product launch.', scheduled_at: future(4), sent_at: null, status: 'scheduled', created_at: past(30) },
  { id: 'demo-2', recipient: 'liam@example.com', sender: 'demo@reachinbox.ai', subject: 'Quarterly growth update', body: 'Here is your quarterly growth summary.', scheduled_at: future(28), sent_at: null, status: 'scheduled', created_at: past(50) },
  { id: 'demo-3', recipient: 'ava@example.com', sender: 'demo@reachinbox.ai', subject: 'Welcome to ReachInbox', body: 'Welcome to your new workspace.', scheduled_at: past(2), sent_at: past(2), status: 'sent', created_at: past(72) },
  { id: 'demo-4', recipient: 'noah@example.com', sender: 'demo@reachinbox.ai', subject: 'Your campaign report', body: 'Your latest campaign report is ready.', scheduled_at: past(8), sent_at: past(8), status: 'sent', created_at: past(96) },
  { id: 'demo-5', recipient: 'olivia@example.com', sender: 'demo@reachinbox.ai', subject: 'Reconnect with your audience', body: 'A tailored audience update.', scheduled_at: past(24), sent_at: past(23), status: 'failed', error: 'Simulated provider rate limit', created_at: past(120) },
];

export const seedCampaigns: DemoCampaign[] = [
  { id: 'campaign-1', name: 'Spring product launch', recipient: 'maya@example.com, liam@example.com', subject: 'Introducing our latest release', body: 'See what is new in ReachInbox.', status: 'scheduled', sent: 248, opened: 173, failed: 4, scheduledAt: future(4), createdAt: past(100) },
  { id: 'campaign-2', name: 'Welcome series', recipient: 'ava@example.com', subject: 'Welcome to ReachInbox', body: 'Thanks for joining us.', status: 'sent', sent: 320, opened: 241, failed: 2, createdAt: past(250) },
  { id: 'campaign-3', name: 'Customer re-engagement', recipient: 'noah@example.com', subject: 'We miss you', body: 'A quick check-in for our customers.', status: 'draft', sent: 0, opened: 0, failed: 0, createdAt: past(12) },
];

export function getDemoEmails(): EmailRecord[] {
  const saved = localStorage.getItem(EMAILS_KEY);
  if (!saved) { localStorage.setItem(EMAILS_KEY, JSON.stringify(seedEmails)); return seedEmails.map(v => ({ ...v })); }
  try { return JSON.parse(saved); } catch { return seedEmails; }
}
export function saveDemoEmails(records: EmailRecord[]) { localStorage.setItem(EMAILS_KEY, JSON.stringify(records)); }
export function getDemoCampaigns(): DemoCampaign[] {
  const saved = localStorage.getItem(CAMPAIGNS_KEY);
  if (!saved) { localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(seedCampaigns)); return seedCampaigns.map(v => ({ ...v })); }
  try { return JSON.parse(saved); } catch { return seedCampaigns; }
}
export function saveDemoCampaigns(records: DemoCampaign[]) { localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(records)); }
export function addDemoEmail(record: Omit<EmailRecord, 'id' | 'created_at'>) {
  const records = getDemoEmails();
  records.unshift({ ...record, id: `demo-${crypto.randomUUID()}`, created_at: new Date().toISOString() });
  saveDemoEmails(records);
}
