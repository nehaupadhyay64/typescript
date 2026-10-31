import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [error, setError] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    api.get('/auth/config').then(({ data }) => {
      setConfigured(data.googleConfigured);
      setDemoEnabled(Boolean(data.localDemoEnabled));
    }).catch(() => {
      setConfigured(false);
      setError('The authentication service is unavailable. Start the backend and try again.');
    });
  }, []);

  const openDemo = async () => {
    setDemoLoading(true);
    setError('');
    try {
      const { data } = await api.get('/auth/demo');
      localStorage.setItem('reachinbox_token', data.token);
      localStorage.setItem('reachinbox_demo', 'true');
      navigate('/dashboard', { replace: true });
    } catch (cause: any) {
      setError(cause.response?.data?.error || 'Local demo workspace is unavailable.');
    } finally {
      setDemoLoading(false);
    }
  };

  const continueWithGoogle = () => {
    if (configured) {
      window.location.href = '/api/auth/google';
      return;
    }
    if (demoEnabled) {
      void openDemo();
      return;
    }
    setError('Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env, then restart the backend.');
  };

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="brand login-brand"><div className="brand-logo">R</div><b>ReachInbox</b></div>
        <div className="story-content">
          <div className="story-pill">Reliable outreach, intelligently scheduled</div>
          <h1>Schedule every email.<br /><span>Never miss the moment.</span></h1>
          <p>Plan campaigns, control provider limits, and see every delivery in one focused workspace.</p>
          <div className="story-card"><div className="story-dots"><i /><i /><i /></div><div className="story-line wide" /><div className="story-line" /><div className="story-bars"><i /><i /><i /><i /><i /></div><div className="delivered"><CheckCircle2 />Campaign delivered</div></div>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-box">
          <div className="eyebrow">WELCOME BACK</div>
          <h2>Sign in to your workspace</h2>
          <p>Use your Google account to access ReachInbox.</p>
          <button className="google-button" onClick={continueWithGoogle} disabled={configured === null || demoLoading}>
            <b>G</b> {demoLoading ? 'Opening demo workspace…' : 'Continue with Google'}
          </button>
          {demoEnabled && <>
            <button type="button" className="secondary-button demo-button" onClick={openDemo} disabled={demoLoading}>
              {demoLoading ? 'Opening workspace…' : 'Open local demo workspace'}
            </button>
            <div className="oauth-note">Local development: DEMO mode bypasses Google authentication and is clearly marked only for testing.</div>
          </>}
          {!demoEnabled && configured === false && !error && <div className="oauth-note">Google OAuth credentials are not configured.</div>}
          {error && <div className="form-error">{error}</div>}
        </div>
      </section>
    </main>
  );
}
