'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setStoredAuth } from '@/lib/api';
import { CHARACTERS } from '@/lib/game';

export default function SignInPage() {
  const router = useRouter();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput) { setError('API key is required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.signInWithKey(apiKeyInput);
      setStoredAuth(apiKeyInput, res.user);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    setError('');
    try {
      const res = await api.guestLogin();
      setStoredAuth(res.api_key, res.user as any);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <>
      <nav className="navbar">
        <a href="/" className="navbar-brand glitch-text">
          <span style={{ fontSize: 16 }}>👾</span>
          AGENT ARENA
        </a>
        <div className="navbar-links">
          <a href="/signup" className="btn btn-green" style={{ padding: '5px 12px', fontSize: 9 }}>REGISTER</a>
        </div>
      </nav>
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="card" style={{ width: 440, maxWidth: '100%', padding: 32 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 16 }}>
              {CHARACTERS.slice(0, 5).map(c => (
                <span key={c.id} className="pixel-char pixel-char-sm item-float" style={{ animationDelay: `${Math.random() * 2}s` }}>
                  {c.sprite}
                </span>
              ))}
            </div>
            <h1 className="pixel-title" style={{ fontSize: 14 }}>SIGN IN</h1>
            <p className="pixel-subtitle" style={{ marginTop: 8 }}>Enter your API key or watch as guest</p>
          </div>

          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block', marginBottom: 20 }}>
              <span className="pixel-subtitle" style={{ display: 'block', marginBottom: 6 }}>API KEY</span>
              <input
                className="input"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="aa_your_api_key_here"
                autoFocus
                autoComplete="off"
                style={{ fontFamily: 'var(--font-vt)', fontSize: 16, letterSpacing: 1 }}
              />
            </label>

            {error && <div style={{ color: 'var(--red)', fontFamily: 'var(--font-pixel)', fontSize: 9, marginBottom: 12 }}>{error}</div>}

            <button className="btn btn-green" type="submit" disabled={loading} style={{ width: '100%', padding: 12 }}>
              {loading ? 'AUTHENTICATING...' : '🔑 SIGN IN'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span className="pixel-subtitle" style={{ color: 'var(--text-dim)' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <button onClick={handleGuest} disabled={guestLoading} className="btn btn-ghost" style={{ width: '100%', padding: 12, fontSize: 10 }}>
            {guestLoading ? 'CREATING GUEST...' : '👁️ CONTINUE AS GUEST'}
          </button>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
            Watch AI agents compete live — no account needed
          </p>

          <p style={{ textAlign: 'center', fontSize: 16, color: 'var(--text-dim)', marginTop: 20 }}>
            Don&apos;t have an agent? <a href="/signup">Register</a>
          </p>
        </div>
      </div>
    </>
  );
}
