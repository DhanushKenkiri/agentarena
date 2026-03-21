'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { api, type User, type SandboxTournamentDetail, type SandboxChallenge, type SandboxSubmission, type AgentDomainInfo, getStoredUser } from '@/lib/api';
import { getCharacterForUser, getLevelForRating } from '@/lib/game';

interface CanvasStroke {
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
}

interface CanvasPayload {
  version: 1;
  width: number;
  height: number;
  background: string;
  strokes: CanvasStroke[];
}

const DEFAULT_CANVAS_WIDTH = 860;
const DEFAULT_CANVAS_HEIGHT = 460;

function buildEmptyCanvasPayload(): CanvasPayload {
  return {
    version: 1,
    width: DEFAULT_CANVAS_WIDTH,
    height: DEFAULT_CANVAS_HEIGHT,
    background: '#ffffff',
    strokes: [],
  };
}

function parseCanvasPayload(raw: string): CanvasPayload {
  try {
    const parsed = JSON.parse(raw || '{}') as Partial<CanvasPayload>;
    return {
      version: 1,
      width: Number(parsed.width) || DEFAULT_CANVAS_WIDTH,
      height: Number(parsed.height) || DEFAULT_CANVAS_HEIGHT,
      background: parsed.background || '#ffffff',
      strokes: Array.isArray(parsed.strokes) ? parsed.strokes : [],
    };
  } catch {
    return buildEmptyCanvasPayload();
  }
}

function drawCanvasPayload(ctx: CanvasRenderingContext2D, payload: CanvasPayload) {
  ctx.fillStyle = payload.background || '#ffffff';
  ctx.fillRect(0, 0, payload.width, payload.height);
  for (const stroke of payload.strokes) {
    if (!stroke.points || stroke.points.length === 0) continue;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color || '#0f172a';
    ctx.lineWidth = stroke.width || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (const point of stroke.points.slice(1)) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }
}

function Navbar({ user }: { user: User | null }) {
  const char = user ? getCharacterForUser(user.id, user.character) : null;
  const level = user ? getLevelForRating(user.rating) : null;
  return (
    <nav className="navbar">
      <a href="/" className="navbar-brand glitch-text">
        <span style={{ fontSize: 16 }}>👾</span> AGENT ARENA
      </a>
      <div className="navbar-links">
        <a href="/" className="nav-link">Lobby</a>
        <a href="/playground" className="nav-link">Playground</a>
        <a href="/marketplace" className="nav-link">Market</a>
        <a href="/leaderboard" className="nav-link">Rankings</a>
        {user ? (
          <a href={`/profile/${user.id}`} className="nav-link" style={{ color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="pixel-char pixel-char-sm">{char?.sprite}</span>
            {user.displayName || user.username}
            <span className={`level-badge ${level?.badge}`}>{level?.icon} LV{level?.level}</span>
          </a>
        ) : (
          <a href="/signin" className="nav-link">Sign in</a>
        )}
      </div>
    </nav>
  );
}

/* ─── Code Editor Component ──────────────────────────────────── */

function CodeEditor({ value, onChange, language, readOnly }: { value: string; onChange: (v: string) => void; language: string; readOnly?: boolean }) {
  return (
    <div style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 10px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--text-dim)' }}>{language.toUpperCase()}</span>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--text-dim)' }}>{value.length} chars</span>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        style={{
          width: '100%',
          minHeight: 300,
          maxHeight: 600,
          padding: 12,
          background: '#0a0a0a',
          color: '#e0e0e0',
          border: 'none',
          fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
          fontSize: 14,
          lineHeight: 1.6,
          resize: 'vertical',
          tabSize: 2,
          outline: 'none',
        }}
        onKeyDown={e => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const start = e.currentTarget.selectionStart;
            const end = e.currentTarget.selectionEnd;
            const val = e.currentTarget.value;
            onChange(val.substring(0, start) + '  ' + val.substring(end));
            setTimeout(() => {
              e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
            }, 0);
          }
        }}
      />
    </div>
  );
}

/* ─── Design Preview (sandboxed iframe) ──────────────────────── */

function DesignPreview({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [html]);

  return (
    <div style={{ border: '2px solid var(--border)', borderRadius: 4, overflow: 'hidden', background: '#ffffff' }}>
      <div style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#666' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#888' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#aaa' }} />
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--text-dim)', marginLeft: 8 }}>PREVIEW</span>
      </div>
      <iframe
        ref={iframeRef}
        sandbox="allow-scripts"
        style={{ width: '100%', height: 400, border: 'none', background: '#ffffff' }}
        title="Design Preview"
      />
    </div>
  );
}

function DrawingCanvas({ value, onChange, readOnly }: { value: string; onChange: (nextValue: string) => void; readOnly?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [payload, setPayload] = useState<CanvasPayload>(() => parseCanvasPayload(value));
  const [color, setColor] = useState('#0f172a');
  const [brush, setBrush] = useState(4);
  const drawingRef = useRef(false);

  useEffect(() => {
    setPayload(parseCanvasPayload(value));
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawCanvasPayload(ctx, payload);
  }, [payload]);

  const commit = (nextPayload: CanvasPayload) => {
    setPayload(nextPayload);
    onChange(JSON.stringify(nextPayload));
  };

  const getPoint = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = evt.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return {
      x: Math.max(0, Math.min(canvas.width, (evt.clientX - rect.left) * sx)),
      y: Math.max(0, Math.min(canvas.height, (evt.clientY - rect.top) * sy)),
    };
  };

  const startStroke = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const point = getPoint(evt);
    drawingRef.current = true;
    evt.currentTarget.setPointerCapture(evt.pointerId);
    const next: CanvasPayload = {
      ...payload,
      strokes: [...payload.strokes, { color, width: brush, points: [point] }],
    };
    commit(next);
  };

  const moveStroke = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly || !drawingRef.current) return;
    const point = getPoint(evt);
    const nextStrokes = [...payload.strokes];
    const last = nextStrokes[nextStrokes.length - 1];
    if (!last) return;
    last.points = [...last.points, point];
    commit({ ...payload, strokes: nextStrokes });
  };

  const endStroke = (evt: React.PointerEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    drawingRef.current = false;
    try { evt.currentTarget.releasePointerCapture(evt.pointerId); } catch {}
  };

  const clear = () => {
    if (readOnly) return;
    commit({ ...payload, strokes: [] });
  };

  const undo = () => {
    if (readOnly || payload.strokes.length === 0) return;
    commit({ ...payload, strokes: payload.strokes.slice(0, -1) });
  };

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--text-dim)' }}>{readOnly ? 'CANVAS PREVIEW' : 'CANVAS BOARD'}</span>
        {!readOnly && (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)' }}>
              Color
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 26, height: 20, border: 'none', background: 'transparent' }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)' }}>
              Brush
              <input type="range" min={1} max={16} value={brush} onChange={e => setBrush(Number(e.target.value))} />
              <span style={{ minWidth: 20, textAlign: 'right' }}>{brush}</span>
            </label>
            <button className="btn btn-ghost" onClick={undo} style={{ fontSize: 9, padding: '4px 8px' }}>UNDO</button>
            <button className="btn btn-ghost" onClick={clear} style={{ fontSize: 9, padding: '4px 8px' }}>CLEAR</button>
          </>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={payload.width}
        height={payload.height}
        onPointerDown={startStroke}
        onPointerMove={moveStroke}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        style={{ width: '100%', height: 360, display: 'block', background: payload.background, touchAction: 'none', cursor: readOnly ? 'default' : 'crosshair' }}
      />
    </div>
  );
}

/* ─── Test Results Panel ─────────────────────────────────────── */

function TestResults({ results }: { results: { input: string; expected: string; actual: string; passed: boolean }[] }) {
  if (!results || results.length === 0) return null;
  const passed = results.filter(r => r.passed).length;
  return (
    <div className="card" style={{ padding: 12, marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="pixel-subtitle" style={{ color: 'var(--green)' }}>TEST RESULTS</span>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: passed === results.length ? 'var(--green)' : 'var(--red)' }}>
          {passed}/{results.length} PASSED
        </span>
      </div>
      {results.map((r, i) => (
        <div key={i} style={{ padding: '6px 8px', marginBottom: 4, background: r.passed ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)', border: `1px solid ${r.passed ? 'var(--green)' : 'var(--red)'}`, borderRadius: 4, fontSize: 13 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: r.passed ? 'var(--green)' : 'var(--red)' }}>{r.passed ? '✓ PASS' : '✗ FAIL'}</span>
            <span style={{ color: 'var(--text-dim)' }}>Input: <code style={{ color: 'var(--text-bright)' }}>{r.input}</code></span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
            Expected: <code style={{ color: 'var(--green)' }}>{r.expected}</code>
            {!r.passed && <> · Got: <code style={{ color: 'var(--red)' }}>{r.actual}</code></>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Submission Card ────────────────────────────────────────── */

function SubmissionCard({ sub, user, tournamentId, mode, onVote, isCreator, hasCriteria, criteria, onJudge }: { sub: SandboxSubmission; user: User | null; tournamentId: number; mode: string; onVote: () => void; isCreator?: boolean; hasCriteria?: boolean; criteria?: { id: number; name: string; description: string; weight: number; maxScore: number }[]; onJudge?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [voting, setVoting] = useState(false);
  const [score, setScore] = useState(7);
  const [comment, setComment] = useState('');
  const [criteriaScores, setCriteriaScores] = useState<Record<number, number>>({});
  const [judging, setJudging] = useState(false);

  const char = getCharacterForUser(sub.userId, sub.character);
  const isOwn = user && user.id === sub.userId;

  const handleVote = async () => {
    setVoting(true);
    try {
      await api.voteSandbox(tournamentId, sub.id, score, comment);
      onVote();
    } catch (err: any) {
      alert(err.message);
    }
    setVoting(false);
  };

  return (
    <div className="card" style={{ padding: 14, marginBottom: 10, border: isOwn ? '2px solid var(--green)' : '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="pixel-char pixel-char-sm">{char.sprite}</span>
          <span style={{ color: 'var(--text-bright)', fontWeight: 600 }}>{sub.displayName || sub.username}</span>
          {isOwn && <span className="badge badge-green" style={{ fontSize: 9 }}>YOU</span>}
          <span className="badge badge-dim">{sub.language}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--green)' }}>AUTO: {sub.autoScore}</span>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--blue)' }}>PEER: {sub.peerScore}</span>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, color: 'var(--gold)' }}>TOTAL: {sub.finalScore}</span>
          <span style={{ color: 'var(--text-dim)' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="animate-in">
          {mode === 'canvas' ? (
            <DrawingCanvas value={sub.code} onChange={() => { }} readOnly />
          ) : (mode === 'design' || mode === 'visual') ? (
            <DesignPreview html={sub.code} />
          ) : (
            <CodeEditor value={sub.code} onChange={() => { }} language={sub.language} readOnly />
          )}

          {sub.testResults.length > 0 && <TestResults results={sub.testResults} />}

          {/* Voting */}
          {user && !isOwn && (
            <div style={{ marginTop: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <span className="pixel-subtitle" style={{ color: 'var(--blue)' }}>JUDGE</span>
                <input type="range" min={0} max={10} value={score} onChange={e => setScore(+e.target.value)}
                  style={{ flex: 1 }} />
                <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--gold)', minWidth: 30, textAlign: 'center' }}>{score}/10</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" value={comment} onChange={e => setComment(e.target.value)} placeholder="Comment (optional)" style={{ flex: 1, fontSize: 13 }} />
                <button className="btn btn-green" onClick={handleVote} disabled={voting} style={{ fontSize: 10 }}>
                  {voting ? '...' : '⚖️ VOTE'}
                </button>
              </div>
            </div>
          )}

          {/* Creator Secret Criteria Judging */}
          {isCreator && hasCriteria && criteria && criteria.length > 0 && (
            <div style={{ marginTop: 12, padding: 12, border: '2px solid var(--gold)', borderRadius: 4, background: 'rgba(255,255,255,0.02)' }}>
              <span className="pixel-subtitle" style={{ color: 'var(--gold)', display: 'block', marginBottom: 8 }}>🔒 SECRET CRITERIA SCORING</span>
              {criteria.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--text-dim)', minWidth: 100 }}>{c.name} (×{c.weight})</span>
                  <input type="range" min={0} max={c.maxScore} value={criteriaScores[c.id] || 0}
                    onChange={e => setCriteriaScores({ ...criteriaScores, [c.id]: +e.target.value })} style={{ flex: 1 }} />
                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, color: 'var(--gold)', minWidth: 35, textAlign: 'center' }}>{criteriaScores[c.id] || 0}/{c.maxScore}</span>
                </div>
              ))}
              <button className="btn btn-gold" onClick={async () => {
                setJudging(true);
                try {
                  await api.judgeSandbox(parseInt(String(tournamentId)), sub.id, criteriaScores);
                  onJudge?.();
                } catch (err: any) { alert(err.message); }
                setJudging(false);
              }} disabled={judging} style={{ fontSize: 9, marginTop: 4 }}>
                {judging ? 'SCORING...' : '🔒 SUBMIT CRITERIA SCORES'}
              </button>
            </div>
          )}

          {/* Show criteria scores after finish */}
          {sub.criteriaScores && Object.keys(sub.criteriaScores).length > 0 && criteria && (
            <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--gold)' }}>CRITERIA SCORES:</span>
              <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                {criteria.map(c => (
                  <span key={c.id} style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    {c.name}: <strong style={{ color: 'var(--gold)' }}>{sub.criteriaScores[c.id] ?? '-'}/{c.maxScore}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Sandbox Tournament Page ───────────────────────────── */

export default function SandboxPage() {
  const params = useParams();
  const id = (params?.id ?? '') as string;
  const [data, setData] = useState<SandboxTournamentDetail | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeChallenge, setActiveChallenge] = useState<number>(0);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ testResults: { input: string; expected: string; actual: string; passed: boolean }[] } | null>(null);
  const [chatMsg, setChatMsg] = useState('');
  const [tab, setTab] = useState<'editor' | 'submissions'>('editor');
  const [domains, setDomains] = useState<Record<string, AgentDomainInfo>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  const refreshUser = async () => {
    try { const res = await api.getMe(); setUser(res.user); } catch { }
  };

  const loadData = async () => {
    try {
      const res = await api.getSandboxTournament(parseInt(id));
      setData(res);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUser(getStoredUser());
    api.getSandboxDomains().then(res => setDomains(res.domains)).catch(() => {});
    loadData();
    refreshUser();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  const handleJoin = async () => {
    try { await api.joinSandboxTournament(parseInt(id)); loadData(); } catch (err: any) { alert(err.message); }
  };

  const handleStart = async () => {
    try { await api.startSandboxTournament(parseInt(id)); loadData(); } catch (err: any) { alert(err.message); }
  };

  const handleFinish = async () => {
    if (!confirm('End this competition and calculate final scores?')) return;
    try { await api.finishSandboxTournament(parseInt(id)); loadData(); } catch (err: any) { alert(err.message); }
  };

  const handleSubmit = async () => {
    if (!data || !data.challenges[activeChallenge] || submitting) return;
    setSubmitting(true);
    try {
      const ch = data.challenges[activeChallenge];
      const language = ch.mode === 'code' ? 'javascript' : ch.mode === 'canvas' ? 'canvas-json' : (ch.mode === 'design' || ch.mode === 'visual') ? 'html' : 'text';
      const res = await api.submitSandbox(parseInt(id), ch.id, code, language);
      setLastResult({ testResults: res.testResults });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
    setSubmitting(false);
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    try { await api.sendSandboxChat(parseInt(id), chatMsg.trim()); setChatMsg(''); loadData(); } catch { }
  };

  // Load existing submission into editor on challenge switch
  useEffect(() => {
    if (!data || !user) return;
    const ch = data.challenges[activeChallenge];
    if (!ch) return;
    const existing = data.submissions.find(s => s.userId === user.id && s.challengeId === ch.id);
    if (existing) {
      setCode(existing.code);
    } else {
      // Default template
      if (ch.mode === 'code') {
        setCode(`// ${ch.title}\n// ${ch.prompt.split('\n')[0]}\n\nfunction solution(input) {\n  // Your code here\n  \n}\n`);
      } else if (ch.mode === 'canvas') {
        setCode(JSON.stringify(buildEmptyCanvasPayload()));
      } else if (ch.mode === 'design' || ch.mode === 'visual') {
        setCode(`<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    /* Your styles here */\n    body { margin: 0; font-family: sans-serif; }\n  </style>\n</head>\n<body>\n  <!-- ${ch.title} -->\n  \n</body>\n</html>`);
      } else {
        setCode('');
      }
    }
    setLastResult(null);
  }, [activeChallenge, data?.challenges?.length]);

  if (loading) return (<><Navbar user={user} /><div style={{ textAlign: 'center', padding: 80 }}><div className="animate-pulse pixel-subtitle">LOADING SANDBOX...</div></div></>);
  if (error || !data) return (<><Navbar user={user} /><div style={{ textAlign: 'center', padding: 80 }}><div style={{ fontSize: 48, marginBottom: 12 }}>💀</div><div className="pixel-subtitle" style={{ color: 'var(--red)', marginBottom: 16 }}>{error || 'SANDBOX NOT FOUND'}</div><a href="/playground" className="btn btn-ghost">← BACK TO PLAYGROUND</a></div></>);

  const { tournament: t, players, challenges, submissions, messages } = data;
  const isJoined = user && players.some(p => p.userId === user.id);
  const isCreator = user && t.createdBy === user.id;
  const domainInfo = domains[t.mode] || data.domain || { icon: '🧪', label: t.mode?.toUpperCase() || 'SANDBOX', sandboxType: 'text' };
  const modeIcons: Record<string, string> = { code: '💻', design: '🎨', visual: '🎨', canvas: '🖌️', creative: '✍️', cybersecurity: '🔐', data: '📊', legal: '⚖️', finance: '💰', crypto: '🪙', research: '🔬', knowledge: '📚', simulation: '🎮', modeling3d: '🧊', productivity: '⚡', general: '🧪' };
  const modeLabels: Record<string, string> = { code: 'CODE', design: 'DESIGN', visual: 'VISUAL', canvas: 'CANVAS', creative: 'CREATIVE', cybersecurity: 'CYBERSEC', data: 'DATA', legal: 'LEGAL', finance: 'FINANCE', crypto: 'CRYPTO', research: 'RESEARCH', knowledge: 'KNOWLEDGE', simulation: 'SIM', modeling3d: '3D', productivity: 'PROD', general: 'GENERAL' };
  const currentChallenge = challenges[activeChallenge];
  const challengeSubmissions = currentChallenge
    ? submissions.filter(s => s.challengeId === currentChallenge.id)
    : [];

  return (
    <>
      <Navbar user={user} />
      <div className="container-main" style={{ paddingTop: 20, paddingBottom: 48 }}>
        {/* Header */}
        <div className="game-header" style={{ marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>{domainInfo.icon || modeIcons[t.mode] || '🧪'}</span>
              <h1 className="pixel-title" style={{ fontSize: 12 }}>{t.name}</h1>
              <span className={`badge ${t.status === 'active' ? 'badge-green' : t.status === 'waiting' ? 'badge-gold' : 'badge-dim'}`}>
                {t.status === 'active' ? '● LIVE' : t.status === 'waiting' ? 'WAITING' : 'FINISHED'}
              </span>
              <span className="badge badge-purple">{domainInfo.label || modeLabels[t.mode] || t.mode.toUpperCase()}</span>
              {data.hasCriteria && <span className="badge badge-gold">🔒 {data.criteriaCount} CRITERIA</span>}
            </div>
            <div style={{ fontSize: 16, color: 'var(--text-dim)', display: 'flex', gap: 12 }}>
              <span>{challenges.length} challenge{challenges.length !== 1 ? 's' : ''}</span>
              <span style={{ color: 'var(--border-light)' }}>|</span>
              <span>{t.duration}min</span>
              <span style={{ color: 'var(--border-light)' }}>|</span>
              <span>{t.playerCount} 🎮</span>
              <span style={{ color: 'var(--border-light)' }}>|</span>
              <span>{submissions.length} submissions</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {t.status === 'waiting' && !isJoined && user && <button className="btn btn-green" onClick={handleJoin}>⚔️ JOIN</button>}
            {t.status === 'waiting' && isCreator && t.playerCount >= 1 && <button className="btn btn-gold" onClick={handleStart}>🚀 START</button>}
            {t.status === 'active' && !isJoined && user && <button className="btn btn-green" onClick={handleJoin}>⚔️ JOIN NOW</button>}
            {t.status === 'active' && isCreator && <button className="btn btn-ghost" onClick={handleFinish} style={{ fontSize: 9 }}>🏁 END</button>}
            {!user && <a href="/signup" className="btn btn-green">🎮 SIGN UP</a>}
          </div>
        </div>

        {t.description && <p style={{ color: 'var(--text-dim)', fontSize: 16, marginBottom: 16 }}>{t.description}</p>}

        {/* Waiting state */}
        {t.status === 'waiting' && (
          <div className="card" style={{ padding: 48, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }} className="item-float">⏳</div>
            <h2 className="pixel-subtitle" style={{ color: 'var(--gold)', marginBottom: 8 }}>WAITING FOR PLAYERS</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: 18 }}>{t.playerCount} player{t.playerCount !== 1 ? 's' : ''} joined. {isCreator ? 'Hit START when ready.' : 'Waiting for host.'}</p>
          </div>
        )}

        {/* Finished state */}
        {t.status === 'finished' && (
          <div className="card" style={{ padding: 40, textAlign: 'center', marginBottom: 16, border: '2px solid var(--gold)', boxShadow: '0 0 20px rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <h2 className="pixel-title" style={{ fontSize: 14, color: 'var(--gold)', marginBottom: 12 }}>COMPETITION COMPLETE</h2>
            {t.winnerName && <p style={{ color: 'var(--text-bright)', fontSize: 20 }}>Winner: <strong style={{ color: 'var(--gold)' }}>{t.winnerName}</strong></p>}
            {data.evaluationCriteria && data.evaluationCriteria.length > 0 && (
              <div style={{ marginTop: 16, textAlign: 'left', maxWidth: 500, margin: '16px auto 0' }}>
                <span className="pixel-subtitle" style={{ color: 'var(--gold)', display: 'block', marginBottom: 8 }}>🔒 REVEALED EVALUATION CRITERIA</span>
                {data.evaluationCriteria.map((c: any) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', marginBottom: 2, background: 'rgba(255,255,255,0.03)', borderRadius: 4 }}>
                    <span style={{ color: 'var(--text-bright)', fontSize: 14 }}>{c.name}</span>
                    <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--gold)' }}>Weight ×{c.weight}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active state: main content */}
        {(t.status === 'active' || t.status === 'finished') && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
            <div>
              {/* Challenge Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
                {challenges.map((ch, i) => {
                  const hasSub = user && submissions.some(s => s.userId === user.id && s.challengeId === ch.id);
                  return (
                    <button key={ch.id}
                      onClick={() => { setActiveChallenge(i); setTab('editor'); }}
                      className={activeChallenge === i ? 'btn btn-green' : 'btn btn-ghost'}
                      style={{ fontSize: 9, position: 'relative' }}>
                      #{i + 1} {ch.title.slice(0, 20)}
                      {hasSub && <span style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />}
                    </button>
                  );
                })}
              </div>

              {currentChallenge && (
                <>
                  {/* Challenge Info */}
                  <div className="card" style={{ padding: 16, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <h3 style={{ fontFamily: 'var(--font-pixel)', fontSize: 11, color: 'var(--text-bright)' }}>{currentChallenge.title}</h3>
                      <span className="badge badge-purple">{modeLabels[currentChallenge.mode]}</span>
                    </div>
                    <p style={{ fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{currentChallenge.prompt}</p>
                    {currentChallenge.requirements && (
                      <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 4 }}>
                        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--text-dim)' }}>REQUIREMENTS: </span>
                        <span style={{ fontSize: 14, color: 'var(--text-dim)' }}>{currentChallenge.requirements}</span>
                      </div>
                    )}
                    {currentChallenge.mode === 'code' && currentChallenge.testCases.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--text-dim)' }}>TEST CASES:</span>
                        {currentChallenge.testCases.map((tc, i) => (
                          <div key={i} style={{ fontSize: 13, color: 'var(--text-dim)', padding: '2px 0' }}>
                            <code>solution({tc.input})</code> → <code style={{ color: 'var(--green)' }}>{tc.expectedOutput}</code>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tab: Editor vs Submissions */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <button className={tab === 'editor' ? 'btn btn-green' : 'btn btn-ghost'} onClick={() => setTab('editor')} style={{ fontSize: 9 }}>
                      {currentChallenge.mode === 'code' ? '💻 EDITOR' : currentChallenge.mode === 'canvas' ? '🖌️ BOARD' : (currentChallenge.mode === 'design' || currentChallenge.mode === 'visual') ? '🎨 EDITOR' : '✍️ EDITOR'}
                    </button>
                    <button className={tab === 'submissions' ? 'btn btn-green' : 'btn btn-ghost'} onClick={() => setTab('submissions')} style={{ fontSize: 9 }}>
                      📋 SUBMISSIONS ({challengeSubmissions.length})
                    </button>
                  </div>

                  {tab === 'editor' && t.status === 'active' && isJoined && (
                    <div>
                      {currentChallenge.mode === 'canvas' ? (
                        <DrawingCanvas value={code} onChange={setCode} />
                      ) : (
                        <CodeEditor
                          value={code}
                          onChange={setCode}
                          language={currentChallenge.mode === 'code' ? 'javascript' : (currentChallenge.mode === 'design' || currentChallenge.mode === 'visual') ? 'html' : 'text'}
                        />
                      )}

                      {/* Live design preview */}
                      {(currentChallenge.mode === 'design' || currentChallenge.mode === 'visual') && code.trim() && (
                        <div style={{ marginTop: 12 }}>
                          <DesignPreview html={code} />
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        <button className="btn btn-green" onClick={handleSubmit} disabled={submitting || !code.trim()} style={{ fontSize: 11 }}>
                          {submitting ? 'SUBMITTING...' : '🚀 SUBMIT'}
                        </button>
                        {currentChallenge.mode === 'code' && (
                          <button className="btn btn-ghost" onClick={() => {
                            // Local test run
                            try {
                              const fn = new Function('input', code + '\n; return typeof solution === "function" ? solution(input) : "No solution() function found";');
                              const results = currentChallenge.testCases.map(tc => {
                                try {
                                  const actual = String(fn(tc.input));
                                  return { input: tc.input, expected: tc.expectedOutput, actual, passed: actual.trim() === tc.expectedOutput.trim() };
                                } catch (e: any) {
                                  return { input: tc.input, expected: tc.expectedOutput, actual: `Error: ${e.message}`, passed: false };
                                }
                              });
                              setLastResult({ testResults: results });
                            } catch (e: any) {
                              setLastResult({ testResults: [{ input: '', expected: '', actual: `Syntax Error: ${e.message}`, passed: false }] });
                            }
                          }} style={{ fontSize: 10 }}>
                            ▶ RUN TESTS
                          </button>
                        )}
                      </div>

                      {lastResult && <TestResults results={lastResult.testResults} />}
                    </div>
                  )}

                  {tab === 'editor' && t.status === 'active' && !isJoined && (
                    <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                      <p className="pixel-subtitle" style={{ marginBottom: 12 }}>JOIN TO START CODING</p>
                      {user ? <button className="btn btn-green" onClick={handleJoin}>⚔️ JOIN COMPETITION</button> : <a href="/signup" className="btn btn-green">🎮 SIGN UP</a>}
                    </div>
                  )}

                  {tab === 'editor' && t.status === 'finished' && (
                    <div className="card" style={{ padding: 24, textAlign: 'center' }}>
                      <p className="pixel-subtitle" style={{ color: 'var(--text-dim)' }}>COMPETITION ENDED — BROWSE SUBMISSIONS →</p>
                    </div>
                  )}

                  {tab === 'submissions' && (
                    <div>
                      {challengeSubmissions.length === 0 ? (
                        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                          <p className="pixel-subtitle" style={{ color: 'var(--text-dim)' }}>NO SUBMISSIONS YET</p>
                        </div>
                      ) : (
                        challengeSubmissions.map(sub => (
                          <SubmissionCard key={sub.id} sub={sub} user={user} tournamentId={parseInt(id)} mode={currentChallenge.mode} onVote={loadData}
                            isCreator={!!isCreator} hasCriteria={!!data.hasCriteria} criteria={data.evaluationCriteria} onJudge={loadData} />
                        ))
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Chat */}
              {t.status !== 'finished' && (
                <div className="chat-container" style={{ marginTop: 16 }}>
                  <div className="chat-messages" style={{ minHeight: 80 }}>
                    {messages.length === 0 && <div style={{ padding: 16, textAlign: 'center' }}><span className="pixel-subtitle" style={{ color: 'var(--text-dim)' }}>NO MESSAGES YET</span></div>}
                    {messages.map(m => (<div key={m.id} className="chat-message"><span className="chat-user" style={{ color: 'var(--blue)' }}>{m.username}</span><span style={{ color: 'var(--text-primary)' }}>{m.message}</span></div>))}
                    <div ref={chatEndRef} />
                  </div>
                  {user && isJoined && (
                    <form className="chat-input-row" onSubmit={handleChat}>
                      <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} placeholder="Type a message..." maxLength={500} />
                      <button type="submit">SEND</button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Right sidebar: Standings + Participants */}
            <div>
              {/* Standings */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ padding: '10px 12px', borderBottom: '2px solid var(--border)' }}>
                  <span className="pixel-subtitle" style={{ color: 'var(--green)' }}>🏆 STANDINGS</span>
                </div>
                <table className="standings-table">
                  <thead><tr><th style={{ width: 30 }}>#</th><th>Player</th><th style={{ width: 40, textAlign: 'right' }}>📝</th><th style={{ width: 50, textAlign: 'right' }}>PTS</th></tr></thead>
                  <tbody>
                    {players.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)' }}>No players yet</td></tr>}
                    {players
                      .map(p => ({ ...p, sandboxScore: data.playerScores[p.userId] }))
                      .sort((a, b) => (b.sandboxScore?.score || 0) - (a.sandboxScore?.score || 0))
                      .map((p, i) => {
                        const pc = getCharacterForUser(p.userId, p.character);
                        return (
                          <tr key={p.userId} style={{ background: user && p.userId === user.id ? 'rgba(255,255,255,0.06)' : undefined }}>
                            <td style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, color: i === 0 ? 'var(--gold)' : 'var(--text-dim)' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className="pixel-char pixel-char-sm">{pc.sprite}</span>
                                <a href={`/profile/${p.userId}`} style={{ color: 'var(--text-bright)', textDecoration: 'none', fontSize: 14 }}>
                                  {p.isBot && <span className="bot-badge" style={{ marginRight: 4 }}>BOT</span>}
                                  {p.displayName || p.username}
                                </a>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-dim)' }}>{p.sandboxScore?.submissions || 0}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-pixel)', fontSize: 10, color: 'var(--green)' }}>{p.sandboxScore?.score || 0}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Quick stats */}
              <div className="card" style={{ padding: 16 }}>
                <div className="pixel-subtitle" style={{ color: 'var(--blue)', marginBottom: 12 }}>📊 STATS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="stat-box" data-label="Players"><div className="stat-value">{players.length}</div></div>
                  <div className="stat-box" data-label="Submissions"><div className="stat-value" style={{ color: 'var(--green)' }}>{submissions.length}</div></div>
                  <div className="stat-box" data-label="Challenges"><div className="stat-value" style={{ color: 'var(--blue)' }}>{challenges.length}</div></div>
                  <div className="stat-box" data-label="Votes"><div className="stat-value" style={{ color: 'var(--gold)' }}>{data.votes.length}</div></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
