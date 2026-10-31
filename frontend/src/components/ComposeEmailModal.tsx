import { useState, type FormEvent } from 'react';
import { CalendarClock, MailPlus, RefreshCw, Save, X } from 'lucide-react';
import { api } from '../lib/api';
import { addDemoEmail, getDemoCampaigns, saveDemoCampaigns } from '../lib/demoStore';

export default function ComposeEmailModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const demo = localStorage.getItem('reachinbox_demo') === 'true';

  const submit = async (event: FormEvent<HTMLFormElement>, action: 'draft' | 'schedule') => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const recipient = String(form.get('recipient') || '').trim();
    const subject = String(form.get('subject') || '').trim();
    const body = String(form.get('body') || '').trim();
    const scheduledAt = String(form.get('scheduledAt') || '').trim();
    if (!recipient || !subject || !body) { setError('Recipient, subject, and message are required.'); return; }
    if (action === 'schedule' && (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now())) { setError('Choose a future date and time for scheduling.'); return; }
    setBusy(true); setError('');
    try {
      if (demo) {
        const status = action === 'draft' ? 'draft' : 'scheduled';
        const campaigns = getDemoCampaigns();
        campaigns.unshift({ id: `campaign-${crypto.randomUUID()}`, name: subject, recipient, subject, body, status, sent: 0, opened: 0, failed: 0, scheduledAt: action === 'schedule' ? new Date(scheduledAt).toISOString() : undefined, createdAt: new Date().toISOString() });
        saveDemoCampaigns(campaigns);
        if (action === 'schedule') addDemoEmail({ recipient, sender: 'demo@reachinbox.ai', subject, body, scheduled_at: new Date(scheduledAt).toISOString(), sent_at: null, status: 'scheduled' });
        onSuccess(); onClose(); return;
      }
      const payload = new FormData(event.currentTarget); payload.set('sender', 'demo@reachinbox.ai'); payload.set('scheduledAt', scheduledAt ? new Date(scheduledAt).toISOString() : new Date(Date.now() + 3600000).toISOString());
      await api.post('/emails/schedule', Object.fromEntries(payload)); onSuccess(); onClose();
    } catch (cause: any) { setError(cause.response?.data?.error || 'The demo campaign could not be saved.'); }
    finally { setBusy(false); }
  };

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="compose-modal" autoComplete="off" onSubmit={event => void submit(event, 'schedule')}>
      <div className="modal-header"><div><div className="modal-title-icon"><MailPlus /></div><div><h2>Compose campaign</h2><p>DEMO MODE · No real email will be sent</p></div></div><button type="button" onClick={onClose}><X /></button></div>
      <div className="modal-content"><section><div className="compose-fields">
        <label className="full">Recipient(s)<input name="recipient" type="text" required placeholder="person@example.com, team@example.com" /></label>
        <label className="full">Subject<input name="subject" required placeholder="A quick introduction…" /></label>
        <label className="full">Message<textarea name="body" required rows={6} placeholder="Write your message…" /></label>
      </div></section><section><div className="schedule-fields"><label className="full">Schedule date & time<input name="scheduledAt" type="datetime-local" /></label></div></section>{error && <div className="form-error">{error}</div>}</div>
      <div className="modal-footer"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
        <button type="button" className="secondary-button" disabled={busy} onClick={event => { const form = event.currentTarget.closest('form') as HTMLFormElement; void submit({ preventDefault() {}, currentTarget: form } as unknown as FormEvent<HTMLFormElement>, 'draft'); }}><Save />Save draft</button>
        <button className="primary-button" disabled={busy}>{busy ? <><RefreshCw className="spin" />Saving…</> : <><CalendarClock />Schedule demo email</>}</button></div>
    </form>
  </div>;
}
