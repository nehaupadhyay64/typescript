import { useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { getDemoCampaigns, saveDemoCampaigns } from '../lib/demoStore';

export default function Drafts() {
  const all = getDemoCampaigns();
  const [drafts, setDrafts] = useState(all.filter(c => c.status === 'draft'));
  const remove = (id: string) => { const next = drafts.filter(c => c.id !== id); setDrafts(next); saveDemoCampaigns(all.filter(c => c.status !== 'draft' || next.some(d => d.id === c.id))); };
  const schedule = (id: string) => { const next = drafts.filter(c => c.id !== id); setDrafts(next); const campaigns = all.map(c => c.id === id ? { ...c, status: 'scheduled' as const } : c); saveDemoCampaigns(campaigns); };
  return <><div className="page-heading"><div><h1>Draft campaigns</h1><p>Drafts stay in this browser and are clearly simulated.</p></div></div><div className="table-card">
    {drafts.length ? <div className="demo-drafts">{drafts.map(d => <article key={d.id}><div><h2>{d.name}</h2><p>{d.subject || 'No subject yet'}</p></div><div><button className="secondary-button" onClick={() => schedule(d.id)}><Send />Schedule demo</button><button className="icon-danger" onClick={() => remove(d.id)}><Trash2 /></button></div></article>)}</div> : <div className="demo-empty">No saved drafts</div>}
  </div></>;
}
