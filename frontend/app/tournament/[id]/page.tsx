'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { api, type TournamentDetail, type User, getStoredUser } from '@/lib/api';
import { getCharacterForUser, getLevelForRating, getPowerUp } from '@/lib/game';

function Navbar({ user }: { user: User | null }) {
  const char = user ? getCharacterForUser(user.id, user.character) : null;
  const level = user ? getLevelForRating(user.rating) : null;
  return (
    <nav className="navbar">
      <a href="/" className="navbar-brand glitch-text">
        <span style={{ fontSize: 16 }}>👾</span>
        AGENT ARENA
      </a>
      <div className="navbar-links">
        <a href="/" className="nav-link">Lobby</a>
        <a href="/tournaments" className="nav-link">Battles</a>
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

export default function TournamentPage() {
  const params = useParams();
  const id = (params?.id ?? '') as string;
  const [data, setData] = useState<TournamentDetail | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; score: number; streakNow: number; powerupConsumed: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedPowerup, setSelectedPowerup] = useState<string | null>(null);
  const [hintOptions, setHintOptions] = useState<string[] | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const lastRoundIdRef = useRef<number | null>(null);

  const refreshUser = async () => {
    try { const res = await api.getMe(); setUser(res.user); } catch {}
  };

  const loadData = async () => {
    try {
      const res = await api.getTournament(parseInt(id));
      setData(res);
      setError('');
      if (res.activeChallenge && res.activeChallenge.roundId !== lastRoundIdRef.current) {
        lastRoundIdRef.current = res.activeChallenge.roundId;
        setSelectedAnswer(null);
        setAnswerResult(null);
        setSelectedPowerup(null);
        setHintOptions(null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUser(getStoredUser());
    loadData();
    refreshUser();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (!data?.activeChallenge) { setTimeLeft(0); return; }
    const tick = () => {
      const end = new Date(data.activeChallenge!.endsAt).getTime();
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data?.activeChallenge?.roundId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  const handleJoin = async () => {
    try { await api.joinTournament(parseInt(id)); loadData(); } catch (err: any) { alert(err.message); }
  };
  const handleStart = async () => {
    try { await api.startTournament(parseInt(id)); loadData(); } catch (err: any) { alert(err.message); }
  };

  const handleHint = async () => {
    if (!data?.activeChallenge || hintOptions) return;
    try {
      const res = await api.getHint(parseInt(id), data.activeChallenge.roundId);
      setHintOptions(res.options);
      setSelectedPowerup('hint');
    } catch (err: any) { alert(err.message); }
  };

  const handleAnswer = async (answer: string) => {
    if (submitting || answerResult || !data?.activeChallenge) return;
    setSelectedAnswer(answer);
    setSubmitting(true);
    try {
      const powerup = selectedPowerup && selectedPowerup !== 'hint' ? selectedPowerup : undefined;
      const res = await api.submitAnswer(parseInt(id), data.activeChallenge.roundId, answer, powerup);
      setAnswerResult({ correct: res.correct, score: res.score, streakNow: res.streakNow, powerupConsumed: res.powerupConsumed });
      refreshUser();
    } catch { setAnswerResult({ correct: false, score: 0, streakNow: 0, powerupConsumed: false }); }
    setSubmitting(false);
  };
  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    try { await api.sendChat(parseInt(id), chatMsg.trim()); setChatMsg(''); loadData(); } catch {}
  };

  if (loading) return (<><Navbar user={user} /><div style={{ textAlign: 'center', padding: 80 }}><div className="animate-pulse pixel-subtitle">LOADING BATTLE...</div></div></>);
  if (error || !data) return (<><Navbar user={user} /><div style={{ textAlign: 'center', padding: 80 }}><div style={{ fontSize: 48, marginBottom: 12 }}>💀</div><div className="pixel-subtitle" style={{ color: 'var(--red)', marginBottom: 16 }}>{error || 'BATTLE NOT FOUND'}</div><a href="/" className="btn btn-ghost">← BACK TO LOBBY</a></div></>);

  const { tournament: t, players, activeChallenge, roundResults, messages } = data;
  const isJoined = user && players.some(p => p.userId === user.id);
  const isCreator = user && t.createdBy === user.id;
  const myPlayer = user ? players.find(p => p.userId === user.id) : null;
  const roundDuration = t.roundDuration || 30;
  const timerPercent = roundDuration > 0 ? (timeLeft / roundDuration) * 100 : 0;
  const timerClass = timerPercent > 50 ? '' : timerPercent > 20 ? 'warning' : 'danger';
  const modeIcon: Record<string, string> = { arena: '🏟️', blitz: '⚡', daily: '📅' };
  const userPowerups = user ? Object.entries(user.powerups || {}).filter(([, count]) => count > 0) : [];

  return (
    <>
      <Navbar user={user} />
      <div className="container-main" style={{ paddingTop: 20, paddingBottom: 48 }}>
        {/* Tournament Header - Game HUD */}
        <div className="game-header" style={{ marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>{modeIcon[t.mode] || '🏟️'}</span>
              <h1 className="pixel-title" style={{ fontSize: 12 }}>{t.name}</h1>
              <span className={`badge ${t.status === 'active' ? 'badge-green' : t.status === 'waiting' ? 'badge-gold' : 'badge-dim'}`}>
                {t.status === 'active' ? '● LIVE' : t.status === 'waiting' ? 'WAITING' : 'GAME OVER'}
              </span>
              {t.mode === 'blitz' && <span className="badge badge-purple">BLITZ</span>}
            </div>
            <div style={{ fontSize: 16, color: 'var(--text-dim)', display: 'flex', gap: 12 }}>
              <span>{t.category}</span>
              <span style={{ color: 'var(--border-light)' }}>|</span>
              <span>{t.duration}min</span>
              <span style={{ color: 'var(--border-light)' }}>|</span>
              <span style={{ color: 'var(--blue)' }}>Round {t.currentRound}/{t.totalRounds}</span>
              <span style={{ color: 'var(--border-light)' }}>|</span>
              <span>{t.playerCount} 🎮</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {t.status === 'waiting' && !isJoined && user && <button className="btn btn-green" onClick={handleJoin}>⚔️ JOIN</button>}
            {t.status === 'waiting' && isCreator && t.playerCount >= 1 && <button className="btn btn-gold" onClick={handleStart}>🚀 START</button>}
            {t.status === 'active' && !isJoined && user && <button className="btn btn-green" onClick={handleJoin}>⚔️ JOIN NOW</button>}
            {!user && <a href="/signup" className="btn btn-green">🎮 SIGN UP</a>}
          </div>
        </div>

        {t.status === 'active' && activeChallenge && (
          <div className="timer-bar" style={{ marginBottom: 16 }}>
            <div className={`timer-bar-fill ${timerClass}`} style={{ width: `${timerPercent}%` }} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
          <div>
            {/* Active Challenge */}
            {t.status === 'active' && activeChallenge && (
              <div className="challenge-card animate-in" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <span className="badge badge-blue" style={{ marginRight: 8 }}>{activeChallenge.category}</span>
                    <span className="badge badge-dim">RND {activeChallenge.roundNumber}</span>
                    {activeChallenge.difficulty > 0 && <span className="badge badge-purple" style={{ marginLeft: 8 }}>{'★'.repeat(Math.min(5, activeChallenge.difficulty))}</span>}
                  </div>
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 16, color: timeLeft <= 5 ? 'var(--red)' : timeLeft <= 10 ? 'var(--gold)' : 'var(--green)', textShadow: timeLeft <= 5 ? '0 0 10px var(--red)' : '0 0 6px var(--green)', fontVariantNumeric: 'tabular-nums', animation: timeLeft <= 5 ? 'timerBlink 0.5s steps(1) infinite' : 'none' }}>
                    {timeLeft}s
                  </div>
                </div>
                <p style={{ fontSize: 20, color: 'var(--text-bright)', lineHeight: 1.6, marginBottom: 20 }}>{activeChallenge.question}</p>

                {/* Power-up Bar */}
                {isJoined && !answerResult && userPowerups.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, padding: '8px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--purple)', borderRadius: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--purple)', alignSelf: 'center', marginRight: 4 }}>USE:</span>
                    {userPowerups.map(([puId, count]) => {
                      const pu = getPowerUp(puId);
                      if (!pu) return null;
                      const isSelected = selectedPowerup === puId;
                      const isHint = puId === 'hint';
                      return (
                        <button key={puId}
                          onClick={() => isHint ? handleHint() : setSelectedPowerup(isSelected ? null : puId)}
                          style={{
                            padding: '4px 10px', fontSize: 13, cursor: 'pointer',
                            border: isSelected ? '2px solid var(--green)' : '1px solid var(--border)',
                            background: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.3)',
                            borderRadius: 4, color: 'var(--text-bright)',
                            boxShadow: isSelected ? '0 0 8px rgba(255,255,255,0.2)' : 'none',
                          }}
                          title={pu.description}
                        >
                          {pu.icon} {pu.name} <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>x{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div>
                  {activeChallenge.options.map((opt, i) => {
                    const letter = String.fromCharCode(65 + i);
                    let cn = 'challenge-option';
                    if (selectedAnswer === opt) cn += ' selected';
                    if (answerResult) { if (opt === selectedAnswer && answerResult.correct) cn += ' correct'; if (opt === selectedAnswer && !answerResult.correct) cn += ' wrong'; }
                    const dimmed = hintOptions && !hintOptions.includes(opt);
                    return (
                      <div key={i} className={cn} onClick={() => !dimmed && handleAnswer(opt)} style={{ opacity: (answerResult && opt !== selectedAnswer) ? 0.4 : dimmed ? 0.2 : 1, pointerEvents: dimmed ? 'none' : 'auto' }}>
                        <span className="option-marker">{letter}</span><span>{opt}</span>
                        {hintOptions && hintOptions.includes(opt) && !answerResult && (
                          <span style={{ marginLeft: 'auto', fontSize: 12 }}>🔮</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {answerResult && (
                  <div className="animate-in" style={{ marginTop: 16, padding: 12, border: `2px solid ${answerResult.correct ? 'var(--green)' : 'var(--red)'}`, background: answerResult.correct ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)' }}>
                    <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, color: answerResult.correct ? 'var(--green)' : 'var(--red)', textShadow: `0 0 8px ${answerResult.correct ? 'var(--green)' : 'var(--red)'}` }}>
                      {answerResult.correct ? `✓ CORRECT! +${answerResult.score} PTS` : '✗ WRONG ANSWER'}
                    </span>
                    {answerResult.streakNow >= 3 && <span className="streak-fire" style={{ marginLeft: 12 }}>🔥 {answerResult.streakNow}x STREAK</span>}
                    {answerResult.powerupConsumed && selectedPowerup && (
                      <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--purple)' }}>
                        {getPowerUp(selectedPowerup)?.icon} used!
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {t.status === 'waiting' && (
              <div className="card" style={{ padding: 48, textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }} className="item-float">⏳</div>
                <h2 className="pixel-subtitle" style={{ color: 'var(--gold)', marginBottom: 8 }}>WAITING FOR PLAYERS</h2>
                <p style={{ color: 'var(--text-dim)', fontSize: 18 }}>{t.playerCount} player{t.playerCount !== 1 ? 's' : ''} joined. {isCreator ? 'Hit START when ready.' : 'Waiting for host.'}</p>
              </div>
            )}

            {t.status === 'active' && !activeChallenge && (
              <div className="card" style={{ padding: 40, textAlign: 'center', marginBottom: 16 }}>
                <div className="animate-pulse" style={{ fontSize: 32, marginBottom: 8 }}>⚔️</div>
                <p className="pixel-subtitle" style={{ color: 'var(--gold)' }}>NEXT ROUND INCOMING...</p>
              </div>
            )}

            {t.status === 'finished' && (
              <div className="card" style={{ padding: 40, textAlign: 'center', marginBottom: 16, border: '2px solid var(--gold)', boxShadow: '0 0 20px rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
                <h2 className="pixel-title" style={{ fontSize: 14, color: 'var(--gold)', marginBottom: 12 }}>GAME OVER</h2>
                {players[0] && (() => { const wc = getCharacterForUser(players[0].userId, players[0].character); return (<div><div className="pixel-char pixel-char-xl item-float" style={{ margin: '0 auto 8px', display: 'flex' }}>{wc.sprite}</div><p style={{ color: 'var(--text-bright)', fontSize: 20 }}>Winner: <strong style={{ color: 'var(--gold)' }}>{players[0].displayName || players[0].username}</strong></p><p className="pixel-subtitle" style={{ color: 'var(--green)', marginTop: 4 }}>{players[0].score} PTS</p></div>); })()}
              </div>
            )}

            {roundResults.length > 0 && (
              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <h3 className="pixel-subtitle" style={{ marginBottom: 12, color: 'var(--text-dim)' }}>📋 LAST ROUND</h3>
                {(() => { const last = roundResults[roundResults.length - 1]; return (<div><div style={{ fontSize: 16, color: 'var(--text-dim)', marginBottom: 4 }}><span className="badge badge-blue" style={{ marginRight: 8 }}>{last.category}</span><span className="badge badge-dim">RND {last.roundNumber}</span></div><p style={{ fontSize: 18, color: 'var(--text-bright)', marginBottom: 8 }}>{last.question}</p><p style={{ fontSize: 16, color: 'var(--green)' }}>✓ {last.correctAnswer}</p><p style={{ fontSize: 14, color: 'var(--text-dim)', marginTop: 4 }}>{last.explanation}</p></div>); })()}
              </div>
            )}

            {(t.status === 'active' || t.status === 'waiting') && (
              <div className="chat-container">
                <div className="chat-messages" style={{ minHeight: 120 }}>
                  {messages.length === 0 && <div style={{ padding: 16, textAlign: 'center' }}><span className="pixel-subtitle" style={{ color: 'var(--text-dim)' }}>NO MESSAGES YET</span></div>}
                  {messages.map(m => (<div key={m.id} className="chat-message"><span className="chat-user" style={{ color: 'var(--blue)' }}>{m.username}</span><span style={{ color: 'var(--text-primary)' }}>{m.message}</span></div>))}
                  <div ref={chatEndRef} />
                </div>
                {user && isJoined && (
                  <form className="chat-input-row" onSubmit={handleChat}>
                    <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} placeholder="Type a message..." maxLength={300} />
                    <button type="submit">SEND</button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Right: Standings */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ padding: '10px 12px', borderBottom: '2px solid var(--border)' }}>
                <span className="pixel-subtitle" style={{ color: 'var(--green)' }}>⚔️ STANDINGS</span>
              </div>
              <table className="standings-table">
                <thead><tr><th style={{ width: 30 }}>#</th><th>Player</th><th style={{ width: 60, textAlign: 'right' }}>PTS</th><th style={{ width: 50, textAlign: 'right' }}>🔥</th></tr></thead>
                <tbody>
                  {players.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)' }}>No players yet</td></tr>}
                  {players.map((p, i) => {
                    const pc = getCharacterForUser(p.userId, p.character);
                    const pl = getLevelForRating(p.rating);
                    return (
                      <tr key={p.userId} className={i < 3 ? `rank-${i + 1}` : ''} style={{ background: user && p.userId === user.id ? 'rgba(255,255,255,0.06)' : undefined }}>
                        <td style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, color: i === 0 ? 'var(--gold)' : 'var(--text-dim)' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="pixel-char pixel-char-sm">{pc.sprite}</span>
                            <a href={`/profile/${p.userId}`} style={{ color: 'var(--text-bright)', fontWeight: user && p.userId === user.id ? 700 : 400, textDecoration: 'none', fontSize: 15 }}>
                              {p.isBot && <span className="bot-badge" style={{ marginRight: 4 }}>BOT</span>}
                              {p.displayName || p.username}
                            </a>
                            <span className={`level-badge ${pl.badge}`} style={{ fontSize: 6 }}>{pl.icon}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-pixel)', fontSize: 10, color: 'var(--green)' }}>{p.score}</td>
                        <td style={{ textAlign: 'right' }}>{p.streak >= 3 ? <span className="streak-fire">🔥{p.streak}</span> : <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>{p.streak > 0 ? p.streak : '—'}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {myPlayer && (
              <div className="card" style={{ padding: 16 }}>
                <div className="pixel-subtitle" style={{ color: 'var(--blue)', marginBottom: 12 }}>🎮 YOUR STATS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="stat-box" data-label="Score"><div className="stat-value" style={{ color: 'var(--green)' }}>{myPlayer.score}</div></div>
                  <div className="stat-box" data-label="Accuracy"><div className="stat-value" style={{ color: 'var(--blue)' }}>{myPlayer.correctAnswers}/{myPlayer.roundsPlayed}</div></div>
                  <div className="stat-box" data-label="Best Streak"><div className="stat-value" style={{ color: 'var(--orange)' }}>{myPlayer.bestStreak}</div></div>
                  <div className="stat-box" data-label="Avg Time"><div className="stat-value">{myPlayer.avgTimeMs > 0 ? `${(myPlayer.avgTimeMs / 1000).toFixed(1)}s` : '—'}</div></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
