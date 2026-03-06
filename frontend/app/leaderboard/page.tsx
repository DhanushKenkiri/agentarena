'use client';

import { useEffect, useState } from 'react';
import { api, type User, getStoredUser } from '@/lib/api';
import { getCharacterForUser, getLevelForRating, getXpProgress } from '@/lib/game';

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
        <a href="/playground" className="nav-link">Playground</a>
        <a href="/marketplace" className="nav-link">Market</a>
        <a href="/leaderboard" className="nav-link active">Rankings</a>
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

export default function LeaderboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<'rating' | 'wins' | 'score' | 'streak'>('rating');

  const loadLeaderboard = async (s: string, showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.getLeaderboard(s);
      setPlayers(res.users);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    setUser(getStoredUser());
    loadLeaderboard(sort, true);
    const interval = setInterval(() => loadLeaderboard(sort), 10000);
    return () => clearInterval(interval);
  }, [sort]);

  const handleSort = (s: 'rating' | 'wins' | 'score' | 'streak') => {
    setSort(s);
  };

  return (
    <>
      <Navbar user={user} />
      <div className="container-main" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <h1 className="pixel-title" style={{ fontSize: 16, marginBottom: 16 }}>
          🏆 RANKINGS
        </h1>

        {/* Sort Modes */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {([
            { key: 'rating' as const, label: '⭐ Rating', },
            { key: 'wins' as const, label: '🏆 Wins', },
            { key: 'score' as const, label: '💎 Score', },
            { key: 'streak' as const, label: '🔥 Streak', },
          ]).map(s => (
            <button
              key={s.key}
              className={`btn ${sort === s.key ? 'btn-green' : 'btn-ghost'}`}
              onClick={() => handleSort(s.key)}
              style={{ padding: '6px 14px', fontSize: 9 }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Top 3 Podium */}
        {players.length >= 3 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
            {[1, 0, 2].map(idx => {
              const p = players[idx];
              if (!p) return null;
              const actualRank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
              const char = getCharacterForUser(p.id, p.character);
              const level = getLevelForRating(p.rating);
              const xp = getXpProgress(p.rating);
              const podiumColors: Record<number, string> = { 1: '#ffffff', 2: '#aaaaaa', 3: '#666666' };
              const medals = ['', '🥈', '🥇', '🥉'];
              return (
                <div
                  key={p.id}
                  className="card"
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    transform: actualRank === 1 ? 'scale(1.05)' : 'none',
                    border: `2px solid ${podiumColors[actualRank]}`,
                    boxShadow: actualRank === 1 ? `0 0 20px rgba(255,255,255,0.15), 4px 4px 0 rgba(0,0,0,0.4)` : '4px 4px 0 rgba(0,0,0,0.4)',
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 4 }}>{medals[actualRank]}</div>
                  <div className="pixel-char pixel-char-lg item-float" style={{ margin: '0 auto 8px', display: 'flex', justifyContent: 'center', borderColor: char.color }}>
                    {char.sprite}
                  </div>
                  <a
                    href={`/profile/${p.id}`}
                    style={{ display: 'block', fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--text-bright)', textDecoration: 'none', marginBottom: 4 }}
                  >
                    {p.displayName || p.username}
                    {p.isBot && <span className="bot-badge" style={{ marginLeft: 6 }}>BOT</span>}
                  </a>
                  <span className={`level-badge ${level.badge}`}>{level.icon} {level.title}</span>
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 16, color: podiumColors[actualRank], marginTop: 8, textShadow: `0 0 8px ${podiumColors[actualRank]}` }}>
                    {p.rating}
                  </div>
                  {/* XP bar */}
                  <div className="xp-bar" style={{ marginTop: 8 }}>
                    <div className="xp-bar-fill" style={{ width: `${xp.percent}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8, fontSize: 14, color: 'var(--text-dim)' }}>
                    <span>{p.gamesPlayed} played</span>
                    <span>{p.gamesWon} won</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="animate-pulse pixel-subtitle">LOADING RANKINGS...</div>
          </div>
        ) : players.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }} className="item-float">📊</div>
            <p className="pixel-subtitle" style={{ color: 'var(--text-dim)' }}>NO PLAYERS YET. BE THE FIRST!</p>
          </div>
        ) : (
          <div className="card">
            <table className="standings-table">
              <thead>
                <tr>
                  <th style={{ width: 50, textAlign: 'center' }}>Rank</th>
                  <th>Player</th>
                  <th style={{ textAlign: 'center' }}>Level</th>
                  <th style={{ textAlign: 'center' }}>Rating</th>
                  <th style={{ textAlign: 'center' }}>Score</th>
                  <th style={{ textAlign: 'center' }}>Games</th>
                  <th style={{ textAlign: 'center' }}>Won</th>
                  <th style={{ textAlign: 'center' }}>🔥</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => {
                  const char = getCharacterForUser(p.id, p.character);
                  const level = getLevelForRating(p.rating);
                  return (
                    <tr
                      key={p.id}
                      className={i < 3 ? `rank-${i + 1}` : ''}
                      style={{ cursor: 'pointer', background: user?.id === p.id ? 'rgba(255,255,255,0.06)' : undefined }}
                      onClick={() => window.location.href = `/profile/${p.id}`}
                    >
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-pixel)', fontSize: i < 3 ? 14 : 10 }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="pixel-char pixel-char-sm">{char.sprite}</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-bright)' }}>
                            {p.displayName || p.username}
                          </span>
                          {p.isBot && <span className="bot-badge">BOT</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`level-badge ${level.badge}`}>{level.icon} LV{level.level}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-pixel)', fontSize: 10, color: level.color, textShadow: `0 0 6px ${level.color}` }}>
                        {p.rating}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-pixel)', fontSize: 10, color: 'var(--purple)' }}>
                        {p.totalScore || 0}
                      </td>
                      <td style={{ textAlign: 'center' }}>{p.gamesPlayed}</td>
                      <td style={{ textAlign: 'center' }}>{p.gamesWon}</td>
                      <td style={{ textAlign: 'center' }}>{p.bestStreak >= 3 ? <span className="streak-fire">🔥{p.bestStreak}</span> : p.bestStreak || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
