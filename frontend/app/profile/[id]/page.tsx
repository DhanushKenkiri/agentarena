'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, type User, type Tournament, getStoredUser } from '@/lib/api';
import { getCharacterForUser, getLevelForRating, getXpProgress, ACHIEVEMENTS, POWERUPS, getAchievement, getPowerUp } from '@/lib/game';

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
          <a href={`/profile/${user.id}`} className="nav-link active" style={{ color: 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: 6 }}>
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

export default function ProfilePage() {
  const params = useParams();
  const profileId = (params?.id ?? '') as string;
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    setCurrentUser(getStoredUser());
    const load = async () => {
      try {
        const res = await api.getUser(profileId);
        setProfile(res.user);
        setTournaments(res.tournamentHistory || []);
        setDisplayName(res.user.displayName || res.user.username);
      } catch {}
      setLoading(false);
    };
    load();
  }, [profileId]);

  const isOwn = currentUser?.id?.toString() === profileId;

  if (loading) {
    return (
      <>
        <Navbar user={currentUser} />
        <div className="container-main" style={{ paddingTop: 60, textAlign: 'center' }}>
          <div className="animate-pulse pixel-subtitle">LOADING PROFILE...</div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Navbar user={currentUser} />
        <div className="container-main" style={{ paddingTop: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💀</div>
          <p className="pixel-subtitle" style={{ color: 'var(--red)' }}>PLAYER NOT FOUND</p>
        </div>
      </>
    );
  }

  const char = getCharacterForUser(profile.id, profile.character);
  const level = getLevelForRating(profile.rating);
  const xp = getXpProgress(profile.rating);
  const userAchievements: string[] = profile.achievements || [];
  const userPowerups: Record<string, number> = profile.powerups || {};
  const hasPowerups = Object.values(userPowerups).some(v => v > 0);

  return (
    <>
      <Navbar user={currentUser} />
      <div className="container-main" style={{ paddingTop: 24, paddingBottom: 48 }}>
        {/* Profile Header Card */}
        <div className="card" style={{ padding: 24, marginBottom: 20, border: `2px solid ${char.color}`, boxShadow: `0 0 20px ${char.color}20, 4px 4px 0 rgba(0,0,0,0.4)` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            {/* Character Avatar */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div className="pixel-char pixel-char-xl char-frame item-float" style={{ borderColor: char.color, boxShadow: `0 0 12px ${char.color}30` }}>
                {char.sprite}
              </div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: char.color, marginTop: 8 }}>{char.name}</div>
              <div style={{ fontSize: 14, color: 'var(--text-dim)' }}>{char.title}</div>
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                {editing ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ width: 200, padding: '4px 8px' }} />
                    <button className="btn btn-green" onClick={async () => { try { const res = await api.updateProfile({ displayName }); setProfile(res.user); } catch {} setEditing(false); }} style={{ padding: '4px 12px', fontSize: 9 }}>Save</button>
                    <button className="btn btn-ghost" onClick={() => setEditing(false)} style={{ padding: '4px 12px', fontSize: 9 }}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <h1 className="pixel-title" style={{ fontSize: 14 }}>
                      {profile.displayName || profile.username}
                    </h1>
                    {profile.isBot && <span className="bot-badge">BOT</span>}
                    {isOwn && (
                      <button className="btn btn-ghost" onClick={() => setEditing(true)} style={{ padding: '2px 8px', fontSize: 8 }}>EDIT</button>
                    )}
                  </>
                )}
              </div>
              <p style={{ fontSize: 16, color: 'var(--text-dim)', marginBottom: 8 }}>
                @{profile.username}
                {profile.isBot && profile.botEngine && <span> · Engine: {profile.botEngine}</span>}
                {profile.createdAt && <span> · Joined {new Date(profile.createdAt).toLocaleDateString()}</span>}
              </p>

              {/* Level + XP Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span className={`level-badge ${level.badge}`} style={{ fontSize: 9 }}>
                  {level.icon} LV{level.level} {level.title}
                </span>
                <div style={{ flex: 1, maxWidth: 300 }}>
                  <div className="xp-bar">
                    <div className="xp-bar-fill" style={{ width: `${xp.percent}%` }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                    <span>{profile.rating}</span>
                    <span>{xp.next} next</span>
                  </div>
                </div>
              </div>

              {/* Rating display */}
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 20, color: level.color, textShadow: `0 0 10px ${level.color}` }}>
                {profile.rating}
                <span style={{ fontSize: 8, marginLeft: 8, color: 'var(--text-dim)' }}>{level.title.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Games Played', value: profile.gamesPlayed, icon: '🎮', color: 'var(--blue)' },
            { label: 'Games Won', value: profile.gamesWon, icon: '🏆', color: 'var(--gold)' },
            { label: 'Win Rate', value: `${profile.gamesPlayed > 0 ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100) : 0}%`, icon: '📈', color: 'var(--green)' },
            { label: 'Rating', value: profile.rating, icon: '⭐', color: level.color },
            { label: 'Total Score', value: profile.totalScore || 0, icon: '💎', color: 'var(--purple)' },
            { label: 'Best Streak', value: profile.bestStreak || 0, icon: '🔥', color: 'var(--orange)' },
            { label: 'Day Streak', value: profile.currentDayStreak || 0, icon: '📅', color: 'var(--gold)' },
            { label: 'Achievements', value: userAchievements.length, icon: '🏅', color: 'var(--green)' },
          ].map((stat, i) => (
            <div key={i} className="stat-box" data-label={stat.label}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
              <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Achievements */}
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <h2 className="pixel-subtitle" style={{ color: 'var(--gold)', marginBottom: 12 }}>🏅 ACHIEVEMENTS</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ACHIEVEMENTS.map(a => {
              const isEarned = userAchievements.includes(a.id);
              return (
                <div
                  key={a.id}
                  className="power-card"
                  style={{
                    opacity: isEarned ? 1 : 0.3,
                    borderColor: isEarned ? 'var(--gold)' : 'var(--border)',
                    color: isEarned ? 'var(--gold)' : 'var(--text-dim)',
                  }}
                  title={a.description}
                >
                  <span style={{ fontSize: 16 }}>{a.icon}</span>
                  <span>{a.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Power-up Inventory */}
        {hasPowerups && (
          <div className="card" style={{ padding: 16, marginBottom: 20 }}>
            <h2 className="pixel-subtitle" style={{ color: 'var(--purple)', marginBottom: 12 }}>🎒 POWER-UPS</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(userPowerups).filter(([, c]) => c > 0).map(([puId, count]) => {
                const pu = getPowerUp(puId);
                if (!pu) return null;
                return (
                  <div key={puId} className="power-card" style={{ borderColor: 'var(--purple)', color: 'var(--text-bright)' }}>
                    <span style={{ fontSize: 16 }}>{pu.icon}</span>
                    <span>{pu.name}</span>
                    <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, color: 'var(--green)' }}>x{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Character Info */}
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <h2 className="pixel-subtitle" style={{ color: char.color, marginBottom: 12 }}>🎭 CHARACTER</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="pixel-char pixel-char-xl char-frame" style={{ borderColor: char.color }}>
              {char.sprite}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, color: char.color, marginBottom: 4 }}>{char.name}</div>
              <div style={{ fontSize: 18, color: 'var(--text-bright)', marginBottom: 2 }}>{char.title}</div>
              <div style={{ fontSize: 16, color: 'var(--text-dim)' }}>Passive: {char.passive}</div>
            </div>
          </div>
        </div>

        {/* Tournament History */}
        {tournaments.length > 0 && (
          <div className="card" style={{ padding: 16, marginBottom: 20 }}>
            <h2 className="pixel-subtitle" style={{ color: 'var(--blue)', marginBottom: 12 }}>📜 RECENT BATTLES</h2>
            <table className="standings-table">
              <thead>
                <tr>
                  <th>Tournament</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Rounds</th>
                  <th style={{ textAlign: 'center' }}>Players</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map(t => {
                  const modeIcon: Record<string, string> = { arena: '🏟️', blitz: '⚡', daily: '📅' };
                  return (
                    <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/tournament/${t.id}`}>
                      <td>
                        <a href={`/tournament/${t.id}`} style={{ color: 'var(--text-bright)', textDecoration: 'none' }}>
                          {t.winnerId === profile.id && <span style={{ marginRight: 6 }}>🏆</span>}
                          {t.name}
                        </a>
                      </td>
                      <td><span className="badge badge-dim">{modeIcon[t.mode] || ''} {t.mode}</span></td>
                      <td>
                        <span className={`badge ${t.status === 'active' ? 'badge-green' : t.status === 'waiting' ? 'badge-gold' : 'badge-dim'}`}>
                          {t.status === 'active' ? '● LIVE' : t.status === 'finished' ? 'DONE' : 'WAITING'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{t.currentRound}/{t.totalRounds}</td>
                      <td style={{ textAlign: 'center' }}>{t.playerCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Status */}
        <div className="card" style={{ padding: 16 }}>
          <h2 className="pixel-subtitle" style={{ color: 'var(--text-dim)', marginBottom: 12 }}>📡 STATUS</h2>
          <div style={{ display: 'flex', gap: 16, fontSize: 16, color: 'var(--text-dim)' }}>
            <span>
              {profile.online ? (
                <span style={{ color: 'var(--green)' }}>● Online</span>
              ) : (
                <span>○ Offline</span>
              )}
            </span>
            {profile.lastSeen && (
              <span>Last seen: {new Date(profile.lastSeen).toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
