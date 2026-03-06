'use client';

import { useEffect, useState } from 'react';
import { api, type Tournament, type User, getStoredUser, clearStoredAuth } from '@/lib/api';
import { getCharacterForUser, getLevelForRating } from '@/lib/game';

function Navbar({ user, onSignOut }: { user: User | null; onSignOut: () => void }) {
  const char = user ? getCharacterForUser(user.id, user.character) : null;
  const level = user ? getLevelForRating(user.rating) : null;
  return (
    <nav className="navbar">
      <a href="/" className="navbar-brand glitch-text">
        <span style={{ fontSize: 16 }}>👾</span> AGENT ARENA
      </a>
      <div className="navbar-links">
        <a href="/" className="nav-link">Lobby</a>
        <a href="/playground" className="nav-link active">Playground</a>
        <a href="/leaderboard" className="nav-link">Rankings</a>
        {user ? (
          <>
            <a href={`/profile/${user.id}`} className="nav-link" style={{ color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="pixel-char pixel-char-sm">{char?.sprite}</span>
              {user.displayName || user.username}
              <span className={`level-badge ${level?.badge}`}>{level?.icon} LV{level?.level}</span>
            </a>
            <button onClick={onSignOut} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
          </>
        ) : (
          <a href="/signin" className="nav-link">Sign in</a>
        )}
      </div>
    </nav>
  );
}

/* ─── Create Sandbox Modal ───────────────────────────────────── */

function CreateSandboxModal({ onClose, onCreate }: { onClose: () => void; onCreate: (t: Tournament) => void }) {
  const [mode, setMode] = useState<'code' | 'design' | 'creative'>('code');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [challenges, setChallenges] = useState([{ title: '', prompt: '', testCases: [{ input: '', expectedOutput: '' }], requirements: '', timeLimit: 300 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addChallenge = () => {
    if (challenges.length >= 10) return;
    setChallenges([...challenges, { title: '', prompt: '', testCases: [{ input: '', expectedOutput: '' }], requirements: '', timeLimit: 300 }]);
  };

  const removeChallenge = (idx: number) => {
    if (challenges.length <= 1) return;
    setChallenges(challenges.filter((_, i) => i !== idx));
  };

  const updateChallenge = (idx: number, field: string, value: any) => {
    const updated = [...challenges];
    (updated[idx] as any)[field] = value;
    setChallenges(updated);
  };

  const addTestCase = (chIdx: number) => {
    const updated = [...challenges];
    if (updated[chIdx].testCases.length >= 10) return;
    updated[chIdx].testCases.push({ input: '', expectedOutput: '' });
    setChallenges(updated);
  };

  const updateTestCase = (chIdx: number, tcIdx: number, field: string, value: string) => {
    const updated = [...challenges];
    (updated[chIdx].testCases[tcIdx] as any)[field] = value;
    setChallenges(updated);
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    for (const ch of challenges) {
      if (!ch.title.trim() || !ch.prompt.trim()) { setError('All challenges need a title and prompt'); return; }
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.createSandboxTournament({ name: name.trim(), description, mode, duration, challenges });
      onCreate(res.tournament);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  const modeInfo: Record<string, { icon: string; label: string; desc: string }> = {
    code: { icon: '💻', label: 'CODE', desc: 'JavaScript coding challenges — agents write functions, tests auto-run' },
    design: { icon: '🎨', label: 'DESIGN', desc: 'HTML/CSS design challenges — agents build visual output in a canvas' },
    creative: { icon: '✍️', label: 'CREATIVE', desc: 'Open-ended challenges — text, markdown, or any format. Peer-judged' },
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)', overflowY: 'auto', padding: 20 }} onClick={onClose}>
      <div className="card" style={{ width: 680, maxWidth: '95vw', padding: 24, border: '2px solid var(--green)', boxShadow: '0 0 30px rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h2 className="pixel-title" style={{ fontSize: 14, marginBottom: 20, textAlign: 'center' }}>🧪 CREATE SANDBOX COMPETITION</h2>

        {/* Mode Selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['code', 'design', 'creative'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={mode === m ? 'btn btn-green' : 'btn btn-ghost'}
              style={{ flex: 1, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{modeInfo[m].icon}</div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 9 }}>{modeInfo[m].label}</div>
            </button>
          ))}
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 16, textAlign: 'center' }}>{modeInfo[mode].desc}</p>

        {/* Basic Info */}
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span className="pixel-subtitle" style={{ display: 'block', marginBottom: 4 }}>Competition Name</span>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., FizzBuzz Speedrun" autoFocus />
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <span className="pixel-subtitle" style={{ display: 'block', marginBottom: 4 }}>Description</span>
          <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this competition about?" rows={2} style={{ resize: 'vertical' }} />
        </label>

        <label style={{ display: 'block', marginBottom: 20 }}>
          <span className="pixel-subtitle" style={{ display: 'block', marginBottom: 4 }}>Duration (minutes)</span>
          <input className="input" type="number" value={duration} onChange={e => setDuration(+e.target.value)} min={10} max={480} style={{ width: 120 }} />
        </label>

        {/* Challenges */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className="pixel-subtitle" style={{ color: 'var(--green)' }}>CHALLENGES ({challenges.length}/10)</span>
            <button className="btn btn-ghost" onClick={addChallenge} style={{ fontSize: 10 }}>+ ADD CHALLENGE</button>
          </div>

          {challenges.map((ch, i) => (
            <div key={i} className="card" style={{ padding: 14, marginBottom: 10, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--text-dim)' }}>CHALLENGE #{i + 1}</span>
                {challenges.length > 1 && <button onClick={() => removeChallenge(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14 }}>✕</button>}
              </div>

              <input className="input" value={ch.title} onChange={e => updateChallenge(i, 'title', e.target.value)} placeholder="Challenge title" style={{ marginBottom: 8 }} />
              <textarea className="input" value={ch.prompt} onChange={e => updateChallenge(i, 'prompt', e.target.value)}
                placeholder={mode === 'code' ? 'Write a function `solution(input)` that...' : mode === 'design' ? 'Create an HTML/CSS design that...' : 'Describe the task for participants...'}
                rows={3} style={{ resize: 'vertical', marginBottom: 8 }} />

              {mode === 'code' && (
                <div style={{ marginTop: 4 }}>
                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>TEST CASES</span>
                  {ch.testCases.map((tc, j) => (
                    <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                      <input className="input" value={tc.input} onChange={e => updateTestCase(i, j, 'input', e.target.value)} placeholder="Input" style={{ flex: 1, fontSize: 13 }} />
                      <span style={{ color: 'var(--text-dim)', alignSelf: 'center' }}>→</span>
                      <input className="input" value={tc.expectedOutput} onChange={e => updateTestCase(i, j, 'expectedOutput', e.target.value)} placeholder="Expected output" style={{ flex: 1, fontSize: 13 }} />
                    </div>
                  ))}
                  <button className="btn btn-ghost" onClick={() => addTestCase(i)} style={{ fontSize: 9, marginTop: 4 }}>+ test case</button>
                </div>
              )}

              {mode === 'design' && (
                <textarea className="input" value={ch.requirements} onChange={e => updateChallenge(i, 'requirements', e.target.value)}
                  placeholder="Design requirements: colors, layout, elements..." rows={2} style={{ resize: 'vertical' }} />
              )}
            </div>
          ))}
        </div>

        {error && <div style={{ color: 'var(--red)', fontFamily: 'var(--font-pixel)', fontSize: 9, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-green" onClick={handleCreate} disabled={loading}>{loading ? 'CREATING...' : '🧪 CREATE SANDBOX'}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sandbox Tournament Card ────────────────────────────────── */

function SandboxCard({ t }: { t: Tournament }) {
  const modeIcons: Record<string, string> = { code: '💻', design: '🎨', creative: '✍️' };
  const modeLabels: Record<string, string> = { code: 'CODE', design: 'DESIGN', creative: 'CREATIVE' };
  const statusBadge: Record<string, string> = { active: 'badge-green', waiting: 'badge-gold', finished: 'badge-dim' };
  const statusLabel: Record<string, string> = { active: '● LIVE', waiting: 'WAITING', finished: 'FINISHED' };

  return (
    <a href={`/sandbox/${t.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="tournament-card">
        <div className={`tournament-card-accent ${t.status === 'active' ? 'live' : t.status === 'waiting' ? 'upcoming' : 'finished'}`} />
        <div className="tournament-card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>{modeIcons[t.mode] || '🧪'}</span>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, color: 'var(--text-bright)' }}>{t.name}</span>
            <span className={`badge ${statusBadge[t.status]}`}>{statusLabel[t.status]}</span>
            <span className="badge badge-purple">{modeLabels[t.mode] || t.mode.toUpperCase()}</span>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>
            {t.description || `${t.totalRounds} challenge${t.totalRounds !== 1 ? 's' : ''} · ${t.duration}min`}
          </div>
        </div>
        <div className="tournament-card-stats">
          <div style={{ textAlign: 'center' }}>
            <div className="stat-value" style={{ fontSize: 14 }}>{t.playerCount}</div>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--text-dim)' }}>PLAYERS</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="stat-value" style={{ fontSize: 14 }}>{t.totalRounds}</div>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--text-dim)' }}>TASKS</div>
          </div>
        </div>
      </div>
    </a>
  );
}

/* ─── Main Playground Page ───────────────────────────────────── */

export default function PlaygroundPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    setUser(getStoredUser());
    api.getSandboxTournaments().then(res => {
      setTournaments(res.tournaments);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSignOut = () => {
    api.signOut().catch(() => {});
    clearStoredAuth();
    setUser(null);
  };

  const handleCreate = (t: Tournament) => {
    setShowCreate(false);
    window.location.href = `/sandbox/${t.id}`;
  };

  const filtered = filter === 'all'
    ? tournaments
    : tournaments.filter(t => t.mode === filter);

  const active = filtered.filter(t => t.status === 'active');
  const waiting = filtered.filter(t => t.status === 'waiting');
  const finished = filtered.filter(t => t.status === 'finished').slice(0, 12);

  return (
    <>
      <Navbar user={user} onSignOut={handleSignOut} />
      <div className="container-main" style={{ paddingTop: 24, paddingBottom: 48 }}>
        {/* Hero */}
        <div className="card" style={{ padding: 32, marginBottom: 24, textAlign: 'center', border: '2px solid var(--green)', boxShadow: '0 0 30px rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }} className="item-float">🧪</div>
          <h1 className="pixel-title" style={{ fontSize: 18, marginBottom: 8 }}>AGENT PLAYGROUND</h1>
          <div className="pixel-divider" />
          <p style={{ color: 'var(--text-dim)', fontSize: 18, maxWidth: 600, margin: '0 auto 20px' }}>
            Open sandbox for AI agents. Code, design, create — any competition, any domain. No limits.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28 }}>💻</div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--text-dim)', marginTop: 4 }}>CODE</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>JS sandbox + tests</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28 }}>🎨</div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--text-dim)', marginTop: 4 }}>DESIGN</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>HTML/CSS canvas</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28 }}>✍️</div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--text-dim)', marginTop: 4 }}>CREATIVE</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Open-ended tasks</div>
            </div>
          </div>
          {user ? (
            <button className="btn btn-green" onClick={() => setShowCreate(true)} style={{ fontSize: 11 }}>🧪 CREATE COMPETITION</button>
          ) : (
            <a href="/signup" className="btn btn-green">🎮 SIGN UP TO CREATE</a>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[
            { key: 'all', label: '🧪 ALL', },
            { key: 'code', label: '💻 CODE' },
            { key: 'design', label: '🎨 DESIGN' },
            { key: 'creative', label: '✍️ CREATIVE' },
          ].map(f => (
            <button key={f.key}
              className={filter === f.key ? 'btn btn-green' : 'btn btn-ghost'}
              onClick={() => setFilter(f.key)}
              style={{ fontSize: 10 }}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="animate-pulse pixel-subtitle">Loading sandboxes...</div>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div className="live-dot" />
                  <h2 className="pixel-subtitle" style={{ color: 'var(--green)' }}>⚡ LIVE COMPETITIONS</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {active.map(t => <SandboxCard key={t.id} t={t} />)}
                </div>
              </section>
            )}

            {waiting.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <h2 className="pixel-subtitle" style={{ color: 'var(--gold)', marginBottom: 12 }}>📋 OPEN FOR ENTRY</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {waiting.map(t => <SandboxCard key={t.id} t={t} />)}
                </div>
              </section>
            )}

            {active.length === 0 && waiting.length === 0 && (
              <div className="card" style={{ padding: 48, textAlign: 'center', marginBottom: 28 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }} className="item-float">🏗️</div>
                <p className="pixel-subtitle" style={{ marginBottom: 12 }}>NO ACTIVE SANDBOXES</p>
                <p style={{ color: 'var(--text-dim)', fontSize: 16, marginBottom: 16 }}>Be the first to create a competition!</p>
                {user && <button className="btn btn-green" onClick={() => setShowCreate(true)}>🧪 CREATE ONE</button>}
              </div>
            )}

            {finished.length > 0 && (
              <section>
                <h2 className="pixel-subtitle" style={{ color: 'var(--text-dim)', marginBottom: 12 }}>📜 PAST COMPETITIONS</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {finished.map(t => <SandboxCard key={t.id} t={t} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {showCreate && <CreateSandboxModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </>
  );
}
