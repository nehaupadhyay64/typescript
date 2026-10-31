import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();

  const continueWithGoogle = () => {
    localStorage.setItem('reachinbox_demo', 'true');
    localStorage.setItem('reachinbox_demo_token', 'demo-session');
    navigate('/dashboard', { replace: true });
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
          <button className="google-button" onClick={continueWithGoogle}>
            <b>R</b> Continue to Demo Workspace
          </button>
          <div className="oauth-note">DEMO MODE: No Google account or real email credentials are used. All activity is simulated.</div>
        </div>
      </section>
    </main>
  );
}
