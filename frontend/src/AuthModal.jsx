import { useState } from 'react';
import { Lock, Mail, User, X, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from './AuthContext';

export default function AuthModal({ mode, onMode, onClose }) {
  const { authenticate } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await authenticate(mode, signup ? form : { email: form.email, password: form.password });
      onClose();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <form className="modal glass" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="icon-btn close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <h2>{signup ? 'Create your account' : 'Welcome back'}</h2>
        <p className="muted">{signup ? 'Sign up to explore the live solar system.' : 'Sign in to view the live solar system.'}</p>
        {signup && <label className="field"><User size={16} /><input placeholder="Full name" value={form.name} onChange={set('name')} required autoComplete="name" /></label>}
        <label className="field"><Mail size={16} /><input type="email" placeholder="Email" value={form.email} onChange={set('email')} required autoComplete="email" /></label>
        <label className="field"><Lock size={16} /><input type="password" placeholder="Password (min 8 characters)" minLength={8} value={form.password} onChange={set('password')} required autoComplete={signup ? 'new-password' : 'current-password'} /></label>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn primary wide" disabled={busy}>{signup ? <UserPlus size={16} /> : <LogIn size={16} />}{busy ? 'Please wait…' : signup ? 'Sign up' : 'Sign in'}</button>
        <p className="muted small">{signup ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" className="link" onClick={() => onMode(signup ? 'signin' : 'signup')}>{signup ? 'Sign in' : 'Sign up'}</button></p>
      </form>
    </div>
  );
}
