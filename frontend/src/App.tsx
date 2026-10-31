import { useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { api } from './lib/api';
import { getDemoEmails, saveDemoEmails } from './lib/demoStore';
import type { User } from './types/user';
import type { EmailRecord } from './types/email';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ComposeEmailModal from './components/ComposeEmailModal';
import { Loading } from './components/Loading';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ScheduledEmails from './pages/ScheduledEmails';
import SentEmails from './pages/SentEmails';
import FailedEmails from './pages/FailedEmails';
import Integrations from './pages/Integrations';
import Campaigns from './pages/Campaigns';
import Drafts from './pages/Drafts';
import Settings from './pages/Settings';
import './App.css';

const demoUser: User = { id: 'demo-user', name: 'Demo Workspace', email: 'demo@reachinbox.ai', avatar: '' };

function Workspace() {
  const [user, setUser] = useState<User | null>(null);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [compose, setCompose] = useState(false);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState('');
  const navigate = useNavigate();
  const demo = localStorage.getItem('reachinbox_demo') === 'true';

  const load = async () => {
    if (demo) { setUser(demoUser); setEmails(getDemoEmails()); setLoading(false); return; }
    try { const [u, e] = await Promise.all([api.get('/me'), api.get('/emails')]); setUser(u.data); setEmails(e.data); }
    catch { localStorage.removeItem('reachinbox_token'); setUser(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const retry = async (id: string) => {
    if (demo) {
      const records = emails.map(email => email.id === id ? { ...email, status: 'scheduled' as const, error: null } : email);
      saveDemoEmails(records); setEmails(records); setToast('Demo email returned to the simulated queue'); return;
    }
    try { await api.post(`/emails/${id}/retry`); setToast('Email queued for retry'); await load(); } catch (error: any) { setToast(error.response?.data?.error || 'Retry failed'); }
  };
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>
    <div className="app-shell"><Sidebar user={user} open={menu} onClose={() => setMenu(false)} />{menu && <div className="sidebar-backdrop" onClick={() => setMenu(false)} />}<main>
      <Header user={user} onMenu={() => setMenu(true)} onCompose={() => setCompose(true)} onLogout={() => { localStorage.removeItem('reachinbox_token'); localStorage.removeItem('reachinbox_demo'); navigate('/login'); }} />
      <div className="page-content"><Outlet context={{ emails, load, retry, openCompose: () => setCompose(true) }} /></div>
    </main></div>
    {compose && <ComposeEmailModal onClose={() => setCompose(false)} onSuccess={() => { void load(); setToast('Demo campaign saved successfully'); }} />}
    {toast && <div className="app-toast" onAnimationEnd={() => setTimeout(() => setToast(''), 2500)}>{toast}</div>}
  </>;
}

export default function App() {
  const callbackToken = new URLSearchParams(location.search).get('token');
  if (callbackToken) { localStorage.setItem('reachinbox_token', callbackToken); localStorage.removeItem('reachinbox_demo'); history.replaceState({}, '', location.pathname); }
  return <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/auth/callback" element={<Navigate to="/dashboard" replace />} />
    <Route path="/" element={localStorage.getItem('reachinbox_demo') === 'true' ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
    <Route element={<Workspace />}>
      <Route path="dashboard" element={<Dashboard />} /><Route path="scheduled" element={<ScheduledEmails />} />
      <Route path="sent" element={<SentEmails />} /><Route path="failed" element={<FailedEmails />} />
      <Route path="campaigns" element={<Campaigns />} /><Route path="drafts" element={<Drafts />} /><Route path="settings" element={<Settings />} />
      <Route path="integrations" element={<Integrations />} />
    </Route><Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>;
}
