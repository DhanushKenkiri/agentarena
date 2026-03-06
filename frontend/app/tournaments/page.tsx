'use client';

import { useEffect, useState } from 'react';
import { api, type Tournament, type User, getStoredUser } from '@/lib/api';
import { getCharacterForUser, getLevelForRating } from '@/lib/game';

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
        <a href="/tournaments" className="nav-link active">Battles</a>
        <a href="/playground" className="nav-link">Playground</a>
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

export default function TournamentsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'waiting' | 'finished'>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'arena' | 'blitz'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredUser());
    const load = async () => {
      try {
        const res = await api.getTournaments();
        setTournaments(res.tournaments);
      } catch {}
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = tournaments
    .filter(t => filter === 'all' || t.status === filter)
    .filter(t => modeFilter === 'all' || t.mode === modeFilter);

  return (
    <>
      <Navbar user={user} />
      <div className="container-main" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <h1 className="pixel-title" style={{ fontSize: 16, marginBottom: 20 }}>
          ⚔️ ALL BATTLES
        </h1>

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['all', 'active', 'waiting', 'finished'] as const).map(f => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-green' : 'btn-ghost'}`}
              onClick={() => setFilter(f)}
              style={{ padding: '6px 14px', fontSize: 9 }}
            >
              {f === 'all' ? 'ALL' : f === 'active' ? '● LIVE' : f === 'waiting' ? 'UPCOMING' : 'FINISHED'}
            </button>
          ))}
        </div>

        {/* Mode Filters + Quick Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {([
              { key: 'all' as const, label: '🎮 All Modes' },
              { key: 'arena' as const, label: '🏟️ Arena' },
              { key: 'blitz' as const, label: '⚡ Blitz' },
            ]).map(m => (
              <button
                key={m.key}
                className={`btn ${modeFilter === m.key ? 'btn-blue' : 'btn-ghost'}`}
                onClick={() => setModeFilter(m.key)}
                style={{ padding: '6px 14px', fontSize: 9 }}
              >
                {m.label}
              </button>
            ))}
          </div>
          {user && (
            <button
              className="btn btn-purple"
              onClick={async () => {
                try {
                  const res = await api.createBlitz();
                  window.location.href = `/tournament/${res.tournament.id}`;
                } catch (err: any) { alert(err.message); }
              }}
              style={{ padding: '8px 16px' }}
            >
              ⚡ QUICK BLITZ
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div className="animate-pulse pixel-subtitle">LOADING BATTLES...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }} className="item-float">🏟️</div>
            <p className="pixel-subtitle" style={{ color: 'var(--text-dim)' }}>NO BATTLES FOUND</p>
          </div>
        ) : (
          <div className="card">
            <table className="standings-table">
              <thead>
                <tr>
                  <th>Tournament</th>
                  <th>Mode</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Players</th>
                  <th style={{ textAlign: 'center' }}>Rounds</th>
                  <th>Winner</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="card-hover" style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/tournament/${t.id}`}>
                    <td>
                      <a href={`/tournament/${t.id}`} style={{ color: 'var(--text-bright)', fontWeight: 600, textDecoration: 'none' }}>
                        {t.name}
                      </a>
                    </td>
                    <td><span className="badge badge-dim">{t.mode === 'blitz' ? '⚡' : '🏟️'} {t.mode}</span></td>
                    <td style={{ color: 'var(--text-dim)' }}>{t.category}</td>
                    <td>
                      <span className={`badge ${t.status === 'active' ? 'badge-green' : t.status === 'waiting' ? 'badge-gold' : 'badge-dim'}`}>
                        {t.status === 'active' ? '● LIVE' : t.status === 'waiting' ? 'WAITING' : 'GAME OVER'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{t.playerCount}{t.maxPlayers ? `/${t.maxPlayers}` : ''}</td>
                    <td style={{ textAlign: 'center' }}>{t.currentRound}/{t.totalRounds}</td>
                    <td style={{ color: t.winnerName ? 'var(--gold)' : 'var(--text-dim)' }}>
                      {t.winnerName ? `🏆 ${t.winnerName}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
