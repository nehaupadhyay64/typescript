import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { CalendarClock, Trash2 } from 'lucide-react';
import type { EmailRecord } from '../types/email';
import { saveDemoEmails } from '../lib/demoStore';

export default function ScheduledEmails() {
  const ctx = useOutletContext<{ emails: EmailRecord[]; load: () => void }>();
  const demo = localStorage.getItem('reachinbox_demo') === 'true';
  const [date, setDate] = useState<Record<string, string>>({});
  const records = ctx.emails.filter(e => e.status === 'scheduled' || e.status === 'paused');
  const update = (id: string, changes: Partial<EmailRecord>) => {
    const next = ctx.emails.map(e => e.id === id ? { ...e, ...changes } : e);
    saveDemoEmails(next); ctx.load();
  };
  return <>
    <div className="page-heading"><div><h1>Scheduled emails</h1><p>Monitor demo schedules. No real email is sent.</p></div></div>
    <div className="table-card scheduled-demo-list">{records.length ? records.map(record => <article key={record.id}>
      <div className="schedule-icon"><CalendarClock /></div><div className="schedule-details"><b>{record.subject}</b><small>To {record.recipient}</small><input type="datetime-local" value={date[record.id] || ''} onChange={e => setDate({ ...date, [record.id]: e.target.value })} /></div>
      <div className="campaign-actions"><button className="secondary-button" disabled={!date[record.id]} onClick={() => { const value = date[record.id]; if (!value || new Date(value).getTime() <= Date.now()) return; update(record.id, { scheduled_at: new Date(value).toISOString() }); }}>Save date</button>{demo && <button className="icon-danger" aria-label="Cancel scheduled demo email" onClick={() => update(record.id, { status: 'failed', error: 'Cancelled in demo mode' })}><Trash2 /></button>}</div>
    </article>) : <div className="demo-empty">No scheduled demo emails</div>}</div>
  </>;
}
