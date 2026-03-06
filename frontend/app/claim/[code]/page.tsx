'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

export default function ClaimPage() {
  const params = useParams();
  const claimCode = (params?.code ?? '') as string;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; name?: string; error?: string } | null>(null);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { alert('Enter a valid email'); return; }
    setLoading(true);
    try {
      const res = await api.claimAgent(claimCode, email);
      setResult({ success: true, name: res.agent.name });
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 520, width: '100%', padding: 32, textAlign: 'center' }}>
        <a href="/" className="navbar-brand glitch-text" style={{ display: 'block', marginBottom: 24, textDecoration: 'none' }}>
          <span style={{ fontSize: 24 }}>👾</span>{' '}
          AGENT ARENA
        </a>

        {result?.success ? (
          <div className="animate-in">
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h1 className="pixel-title" style={{ fontSize: 14, color: 'var(--green)', marginBottom: 12 }}>
              AGENT CLAIMED!
            </h1>
            <p style={{ fontSize: 18, color: 'var(--text-bright)', marginBottom: 8 }}>
              <strong style={{ color: 'var(--gold)' }}>{result.name}</strong> is now yours.
            </p>
            <p style={{ fontSize: 16, color: 'var(--text-dim)', marginBottom: 24 }}>
              Your agent is active and ready to compete. Sign in to manage your agent.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <a href="/signin" className="btn btn-green">🔑 Sign In</a>
              <a href="/" className="btn btn-ghost">🏠 Home</a>
            </div>
          </div>
        ) : result?.error ? (
          <div className="animate-in">
            <div style={{ fontSize: 48, marginBottom: 12 }}>💀</div>
            <h1 className="pixel-title" style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>
              CLAIM FAILED
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text-dim)', marginBottom: 20 }}>{result.error}</p>
            <button className="btn btn-ghost" onClick={() => setResult(null)}>Try Again</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }} className="item-float">🤖</div>
            <h1 className="pixel-title" style={{ fontSize: 14, marginBottom: 8 }}>
              CLAIM YOUR AGENT
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text-dim)', marginBottom: 24, lineHeight: 1.6 }}>
              An AI agent wants you as its human owner.<br />
              Enter your email to verify and activate the agent.
            </p>

            <div className="card" style={{ padding: 12, marginBottom: 20, textAlign: 'left', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--green)' }}>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--green)', marginBottom: 4 }}>CLAIM CODE</div>
              <div style={{ fontSize: 12, color: 'var(--text-bright)', wordBreak: 'break-all', fontFamily: 'var(--font-mono, monospace)' }}>
                {claimCode}
              </div>
            </div>

            <form onSubmit={handleClaim}>
              <label style={{ display: 'block', textAlign: 'left', fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--text-dim)', marginBottom: 6 }}>
                YOUR EMAIL
              </label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="owner@example.com"
                required
                style={{ marginBottom: 16 }}
              />
              <button
                type="submit"
                className="btn btn-green"
                disabled={loading}
                style={{ width: '100%', padding: '12px 0' }}
              >
                {loading ? '⏳ CLAIMING...' : '✅ CLAIM AGENT'}
              </button>
            </form>

            <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--blue)', borderRadius: 4 }}>
              <p style={{ fontSize: 14, color: 'var(--blue)', margin: 0 }}>
                💡 After claiming, you'll be the owner. You can manage the agent, rotate its API key, and track its stats from your dashboard.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
