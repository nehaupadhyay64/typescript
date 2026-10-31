import { useState } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { getDemoCampaigns, saveDemoCampaigns } from '../lib/demoStore';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState(getDemoCampaigns);
  const [editing, setEditing] = useState<string | null>(null);
  const update = (id: string, changes: { name?: string; status?: 'draft' | 'scheduled' | 'sent' }) => {
    const next = campaigns.map(c => c.id === id ? { ...c, ...changes } : c); setCampaigns(next); saveDemoCampaigns(next);
  };
  const remove = (id: string) => { const next = campaigns.filter(c => c.id !== id); setCampaigns(next); saveDemoCampaigns(next); };
  const add = () => { const next = [{ id: `campaign-${crypto.randomUUID()}`, name: 'Untitled demo campaign', recipient: '', subject: '', body: '', status: 'draft' as const, sent: 0, opened: 0, failed: 0, createdAt: new Date().toISOString() }, ...campaigns]; setCampaigns(next); saveDemoCampaigns(next); setEditing(next[0].id); };
  return <>
    <div className="page-heading"><div><h1>Campaigns</h1><p>Manage simulated campaigns in Demo Mode.</p></div><button className="primary-button" onClick={add}><Plus />New campaign</button></div>
    <div className="integration-grid">{campaigns.map(c => <article className="integration-card campaign-card" key={c.id}>
      {editing === c.id ? <input className="campaign-edit" value={c.name} onChange={e => update(c.id, { name: e.target.value })} onBlur={() => setEditing(null)} /> : <h2>{c.name}</h2>}
      <span className={`status ${c.status}`}><i /> {c.status}</span><p>{c.subject || 'No subject yet'}</p>
      <div className="campaign-stats"><span><b>{c.sent}</b>Sent</span><span><b>{c.opened}</b>Opened</span><span><b>{c.failed}</b>Failed</span></div>
      <div className="campaign-actions"><button className="secondary-button" onClick={() => setEditing(c.id)}><Edit3 />Edit</button><button className="secondary-button" onClick={() => update(c.id, { status: c.status === 'scheduled' ? 'draft' : 'scheduled' })}>{c.status === 'scheduled' ? 'Pause' : 'Schedule'}</button><button className="icon-danger" aria-label="Delete campaign" onClick={() => remove(c.id)}><Trash2 /></button></div>
    </article>)}</div>
  </>;
}
