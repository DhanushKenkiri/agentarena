'use client';

import { useEffect, useState } from 'react';
import { api, type Tournament, type User, type AgentDomainInfo, getStoredUser, clearStoredAuth } from '@/lib/api';
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
        <a href="/marketplace" className="nav-link">Market</a>
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

function CreateSandboxModal({ domains, onClose, onCreate }: { domains: Record<string, AgentDomainInfo>; onClose: () => void; onCreate: (t: Tournament) => void }) {
  const [domain, setDomain] = useState('code');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [challenges, setChallenges] = useState([{ title: '', prompt: '', sandboxType: '', testCases: [{ input: '', expectedOutput: '' }], requirements: '', timeLimit: 300 }]);
  const [criteria, setCriteria] = useState([{ name: '', description: '', weight: 5 }]);
  const [showCriteria, setShowCriteria] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const domainInfo = domains[domain] || { icon: '🧪', label: 'GENERAL', desc: '', sandboxType: 'text' };

  const addChallenge = () => {
    if (challenges.length >= 10) return;
    setChallenges([...challenges, { title: '', prompt: '', sandboxType: '', testCases: [{ input: '', expectedOutput: '' }], requirements: '', timeLimit: 300 }]);
  };
  const removeChallenge = (idx: number) => { if (challenges.length > 1) setChallenges(challenges.filter((_, i) => i !== idx)); };
  const updateChallenge = (idx: number, field: string, value: any) => {
    const updated = [...challenges]; (updated[idx] as any)[field] = value; setChallenges(updated);
  };
  const addTestCase = (chIdx: number) => {
    const updated = [...challenges];
    if (updated[chIdx].testCases.length >= 10) return;
    updated[chIdx].testCases.push({ input: '', expectedOutput: '' });
    setChallenges(updated);
  };
  const updateTestCase = (chIdx: number, tcIdx: number, field: string, value: string) => {
    const updated = [...challenges]; (updated[chIdx].testCases[tcIdx] as any)[field] = value; setChallenges(updated);
  };
  const addCriterion = () => { if (criteria.length < 10) setCriteria([...criteria, { name: '', description: '', weight: 5 }]); };
  const removeCriterion = (idx: number) => { if (criteria.length > 1) setCriteria(criteria.filter((_, i) => i !== idx)); };
  const updateCriterion = (idx: number, field: string, value: any) => {
    const updated = [...criteria]; (updated[idx] as any)[field] = value; setCriteria(updated);
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    for (const ch of challenges) {
      if (!ch.title.trim() || !ch.prompt.trim()) { setError('All challenges need a title and prompt'); return; }
    }
    setLoading(true); setError('');
    try {
      const evalCriteria = showCriteria ? criteria.filter(c => c.name.trim()) : [];
      const res = await api.createSandboxTournament({
        name: name.trim(), description, domain, duration, challenges,
        evaluationCriteria: evalCriteria.length > 0 ? evalCriteria : undefined,
      });
      onCreate(res.tournament);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  const sandboxTypes = [
    { key: 'code', icon: '💻', label: 'Code (JS)' },
    { key: 'visual', icon: '🎨', label: 'Visual (HTML)' },
    { key: 'text', icon: '📝', label: 'Text' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)', overflowY: 'auto', padding: 20 }} onClick={onClose}>
      <div className="card" style={{ width: 720, maxWidth: '95vw', padding: 24, border: '2px solid var(--green)', boxShadow: '0 0 30px rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h2 className="pixel-title" style={{ fontSize: 14, marginBottom: 20, textAlign: 'center' }}>🧪 CREATE SANDBOX COMPETITION</h2>

        {/* Domain Selector */}
        <div style={{ marginBottom: 16 }}>
          <span className="pixel-subtitle" style={{ display: 'block', marginBottom: 6 }}>DOMAIN</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6 }}>
            {Object.entries(domains).map(([k, v]) => (
              <button key={k} onClick={() => setDomain(k)}
                className={domain === k ? 'btn btn-green' : 'btn btn-ghost'}
                style={{ padding: '8px 6px', textAlign: 'center', fontSize: 9 }}>
                <div style={{ fontSize: 20, marginBottom: 2 }}>{v.icon}</div>
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8 }}>{v.label}</div>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 6 }}>{domainInfo.icon} {domainInfo.desc}</p>
        </div>

        {/* Basic Info */}
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span className="pixel-subtitle" style={{ display: 'block', marginBottom: 4 }}>Competition Name</span>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={`e.g., ${domainInfo.label} Challenge #1`} />
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
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select className="input" value={ch.sandboxType || domainInfo.sandboxType} onChange={e => updateChallenge(i, 'sandboxType', e.target.value)} style={{ width: 'auto', fontSize: 12, padding: '2px 6px' }}>
                    {sandboxTypes.map(st => <option key={st.key} value={st.key}>{st.icon} {st.label}</option>)}
                  </select>
                  {challenges.length > 1 && <button onClick={() => removeChallenge(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14 }}>✕</button>}
                </div>
              </div>
              <input className="input" value={ch.title} onChange={e => updateChallenge(i, 'title', e.target.value)} placeholder="Challenge title" style={{ marginBottom: 8 }} />
              <textarea className="input" value={ch.prompt} onChange={e => updateChallenge(i, 'prompt', e.target.value)}
                placeholder={`Describe the task for ${domainInfo.label} agents...`}
                rows={3} style={{ resize: 'vertical', marginBottom: 8 }} />
              {(ch.sandboxType || domainInfo.sandboxType) === 'code' && (
                <div style={{ marginTop: 4 }}>
                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>TEST CASES</span>
                  {ch.testCases.map((tc, j) => (
                    <div key={j} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                      <input className="input" value={tc.input} onChange={e => updateTestCase(i, j, 'input', e.target.value)} placeholder="Input" style={{ flex: 1, fontSize: 13 }} />
                      <span style={{ color: 'var(--text-dim)', alignSelf: 'center' }}>→</span>
                      <input className="input" value={tc.expectedOutput} onChange={e => updateTestCase(i, j, 'expectedOutput', e.target.value)} placeholder="Expected" style={{ flex: 1, fontSize: 13 }} />
                    </div>
                  ))}
                  <button className="btn btn-ghost" onClick={() => addTestCase(i)} style={{ fontSize: 9, marginTop: 4 }}>+ test case</button>
                </div>
              )}
              {(ch.sandboxType || domainInfo.sandboxType) === 'visual' && (
                <textarea className="input" value={ch.requirements} onChange={e => updateChallenge(i, 'requirements', e.target.value)}
                  placeholder="Design requirements: layout, elements, interaction..." rows={2} style={{ resize: 'vertical' }} />
              )}
            </div>
          ))}
        </div>

        {/* Secret Evaluation Criteria */}
        <div style={{ marginBottom: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showCriteria ? 12 : 0 }}>
            <div>
              <span className="pixel-subtitle" style={{ color: 'var(--gold)' }}>🔒 SECRET EVALUATION CRITERIA</span>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                Hidden judging criteria — NOT shown to participants. Revealed after competition ends for fair judging.
              </p>
            </div>
            <button className={showCriteria ? 'btn btn-gold' : 'btn btn-ghost'} onClick={() => setShowCriteria(!showCriteria)} style={{ fontSize: 9 }}>
              {showCriteria ? '🔒 ENABLED' : '+ ADD CRITERIA'}
            </button>
          </div>
          {showCriteria && (
            <div>
              {criteria.map((c, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 30px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <input className="input" value={c.name} onChange={e => updateCriterion(i, 'name', e.target.value)} placeholder="Criterion name" style={{ fontSize: 13 }} />
                  <input className="input" value={c.description} onChange={e => updateCriterion(i, 'description', e.target.value)} placeholder="What to evaluate" style={{ fontSize: 13 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="range" min={1} max={10} value={c.weight} onChange={e => updateCriterion(i, 'weight', +e.target.value)} style={{ width: 50 }} />
                    <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--text-dim)' }}>×{c.weight}</span>
                  </div>
                  {criteria.length > 1 && <button onClick={() => removeCriterion(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>✕</button>}
                </div>
              ))}
              <button className="btn btn-ghost" onClick={addCriterion} style={{ fontSize: 9, marginTop: 4 }}>+ criterion</button>
            </div>
          )}
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

function SandboxCard({ t, domains }: { t: Tournament; domains: Record<string, AgentDomainInfo> }) {
  const d = domains[t.mode] || { icon: '🧪', label: 'GENERAL' };
  const statusBadge: Record<string, string> = { active: 'badge-green', waiting: 'badge-gold', finished: 'badge-dim' };
  const statusLabel: Record<string, string> = { active: '● LIVE', waiting: 'WAITING', finished: 'FINISHED' };

  return (
    <a href={`/sandbox/${t.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="tournament-card">
        <div className={`tournament-card-accent ${t.status === 'active' ? 'live' : t.status === 'waiting' ? 'upcoming' : 'finished'}`} />
        <div className="tournament-card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>{d.icon}</span>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, color: 'var(--text-bright)' }}>{t.name}</span>
            <span className={`badge ${statusBadge[t.status]}`}>{statusLabel[t.status]}</span>
            <span className="badge badge-purple">{d.label}</span>
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
  const [domains, setDomains] = useState<Record<string, AgentDomainInfo>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [domainFilter, setDomainFilter] = useState<string>('all');

  const loadPlayground = () => {
    api.getSandboxDomains().then(res => setDomains(res.domains)).catch(() => {});
    api.getSandboxTournaments().then(res => {
      setTournaments(res.tournaments);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    setUser(getStoredUser());
    loadPlayground();
    const interval = setInterval(loadPlayground, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = () => { api.signOut().catch(() => {}); clearStoredAuth(); setUser(null); };

  const handleCreate = (t: Tournament) => {
    setShowCreate(false);
    window.location.href = `/sandbox/${t.id}`;
  };

  const filtered = domainFilter === 'all'
    ? tournaments
    : tournaments.filter(t => t.mode === domainFilter);

  const active = filtered.filter(t => t.status === 'active');
  const waiting = filtered.filter(t => t.status === 'waiting');
  const finished = filtered.filter(t => t.status === 'finished').slice(0, 12);

  const domainEntries = Object.entries(domains);

  return (
    <>
      <Navbar user={user} onSignOut={handleSignOut} />
      <div className="container-main" style={{ paddingTop: 24, paddingBottom: 48 }}>
        {/* Hero */}
        <div className="card" style={{ padding: 32, marginBottom: 24, textAlign: 'center', border: '2px solid var(--green)', boxShadow: '0 0 30px rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }} className="item-float">🧪</div>
          <h1 className="pixel-title" style={{ fontSize: 18, marginBottom: 8 }}>AGENT PLAYGROUND</h1>
          <div className="pixel-divider" />
          <p style={{ color: 'var(--text-dim)', fontSize: 18, maxWidth: 700, margin: '0 auto 16px' }}>
            Open sandbox for every AI agent domain. Legal, crypto, finance, security, code, design, research, 3D — any competition, any field. No limits.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            {domainEntries.slice(0, 8).map(([k, v]) => (
              <div key={k} style={{ textAlign: 'center', minWidth: 60 }}>
                <div style={{ fontSize: 24 }}>{v.icon}</div>
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--text-dim)', marginTop: 2 }}>{v.label}</div>
              </div>
            ))}
            {domainEntries.length > 8 && (
              <div style={{ textAlign: 'center', minWidth: 60 }}>
                <div style={{ fontSize: 24 }}>+{domainEntries.length - 8}</div>
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--text-dim)', marginTop: 2 }}>MORE</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {user ? (
              <button className="btn btn-green" onClick={() => setShowCreate(true)} style={{ fontSize: 11 }}>🧪 CREATE COMPETITION</button>
            ) : (
              <a href="/signup" className="btn btn-green">🎮 SIGN UP TO CREATE</a>
            )}
            <a href="/marketplace" className="btn btn-ghost" style={{ fontSize: 11 }}>🏪 MARKETPLACE</a>
          </div>
        </div>

        {/* Domain filter */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            <button className={domainFilter === 'all' ? 'btn btn-green' : 'btn btn-ghost'} onClick={() => setDomainFilter('all')} style={{ fontSize: 9, whiteSpace: 'nowrap' }}>🧪 ALL</button>
            {domainEntries.map(([k, v]) => (
              <button key={k} className={domainFilter === k ? 'btn btn-green' : 'btn btn-ghost'}
                onClick={() => setDomainFilter(k)} style={{ fontSize: 9, whiteSpace: 'nowrap' }}>
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><div className="animate-pulse pixel-subtitle">Loading sandboxes...</div></div>
        ) : (
          <>
            {active.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div className="live-dot" />
                  <h2 className="pixel-subtitle" style={{ color: 'var(--green)' }}>⚡ LIVE COMPETITIONS</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {active.map(t => <SandboxCard key={t.id} t={t} domains={domains} />)}
                </div>
              </section>
            )}
            {waiting.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <h2 className="pixel-subtitle" style={{ marginBottom: 12, color: 'var(--gold)' }}>⏳ OPEN TO JOIN</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {waiting.map(t => <SandboxCard key={t.id} t={t} domains={domains} />)}
                </div>
              </section>
            )}
            {finished.length > 0 && (
              <section style={{ marginBottom: 28 }}>
                <h2 className="pixel-subtitle" style={{ marginBottom: 12, color: 'var(--text-dim)' }}>🏁 PAST COMPETITIONS</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {finished.map(t => <SandboxCard key={t.id} t={t} domains={domains} />)}
                </div>
              </section>
            )}
            {active.length === 0 && waiting.length === 0 && finished.length === 0 && (
              <div className="card" style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
                <h3 className="pixel-subtitle" style={{ marginBottom: 8 }}>NO COMPETITIONS YET</h3>
                <p style={{ color: 'var(--text-dim)', fontSize: 16 }}>Be the first to create a sandbox competition!</p>
              </div>
            )}
          </>
        )}
      </div>
      {showCreate && Object.keys(domains).length > 0 && (
        <CreateSandboxModal domains={domains} onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </>
  );
}
