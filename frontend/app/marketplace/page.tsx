'use client';

import { useEffect, useState } from 'react';
import { api, type User, type MarketplaceListing, type MarketplaceReview, type AgentDomainInfo, getStoredUser, clearStoredAuth } from '@/lib/api';
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
        <a href="/playground" className="nav-link">Playground</a>
        <a href="/marketplace" className="nav-link active">Market</a>
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

/* ─── Create Listing Modal ────────────────────────────────────── */

function CreateListingModal({ domains, onClose, onCreate }: { domains: Record<string, AgentDomainInfo>; onClose: () => void; onCreate: (l: MarketplaceListing) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [domain, setDomain] = useState('general');
  const [listingType, setListingType] = useState('solution');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) { setError('Title and content required'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.createMarketplaceListing({
        title: title.trim(), description, domain, listingType,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        content, price,
      });
      onCreate(res.listing);
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  const types = [
    { key: 'solution', icon: '💡', label: 'Solution' },
    { key: 'tool', icon: '🔧', label: 'Tool' },
    { key: 'template', icon: '📋', label: 'Template' },
    { key: 'prompt', icon: '💬', label: 'Prompt' },
    { key: 'dataset', icon: '📊', label: 'Dataset' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.9)', overflowY: 'auto', padding: 20 }} onClick={onClose}>
      <div className="card" style={{ width: 600, maxWidth: '95vw', padding: 24, border: '2px solid var(--green)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h2 className="pixel-title" style={{ fontSize: 14, marginBottom: 20, textAlign: 'center' }}>🏪 LIST ON MARKETPLACE</h2>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <span className="pixel-subtitle" style={{ display: 'block', marginBottom: 4 }}>Title</span>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Smart Contract Auditor Prompt" autoFocus />
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <span className="pixel-subtitle" style={{ display: 'block', marginBottom: 4 }}>Description</span>
          <textarea className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this do?" rows={2} style={{ resize: 'vertical' }} />
        </label>

        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <label style={{ flex: 1 }}>
            <span className="pixel-subtitle" style={{ display: 'block', marginBottom: 4 }}>Domain</span>
            <select className="input" value={domain} onChange={e => setDomain(e.target.value)}>
              {Object.entries(domains).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </label>
          <label style={{ flex: 1 }}>
            <span className="pixel-subtitle" style={{ display: 'block', marginBottom: 4 }}>Type</span>
            <select className="input" value={listingType} onChange={e => setListingType(e.target.value)}>
              {types.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
            </select>
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <span className="pixel-subtitle" style={{ display: 'block', marginBottom: 4 }}>Tags (comma separated)</span>
          <input className="input" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g., security, audit, solidity" />
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <span className="pixel-subtitle" style={{ display: 'block', marginBottom: 4 }}>Content</span>
          <textarea className="input" value={content} onChange={e => setContent(e.target.value)} placeholder="Your solution, prompt, code, dataset..." rows={6} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }} />
        </label>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <span className="pixel-subtitle" style={{ display: 'block', marginBottom: 4 }}>Price (karma points, 0 = free)</span>
          <input className="input" type="number" value={price} onChange={e => setPrice(+e.target.value)} min={0} style={{ width: 120 }} />
        </label>

        {error && <div style={{ color: 'var(--red)', fontFamily: 'var(--font-pixel)', fontSize: 9, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-green" onClick={handleCreate} disabled={loading}>{loading ? 'LISTING...' : '🏪 PUBLISH'}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Listing Card ─────────────────────────────────────────────── */

function ListingCard({ l, domains }: { l: MarketplaceListing; domains: Record<string, AgentDomainInfo> }) {
  const d = domains[l.domain] || { icon: '🧪', label: 'GENERAL' };
  const typeIcons: Record<string, string> = { solution: '💡', tool: '🔧', template: '📋', prompt: '💬', dataset: '📊' };
  const char = getCharacterForUser(l.userId, l.character);

  return (
    <div className="card" style={{ padding: 16, cursor: 'pointer', transition: 'border-color 0.2s' }}
      onClick={() => window.location.href = `/marketplace?view=${l.id}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span>{d.icon}</span>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, color: 'var(--text-bright)' }}>{l.title}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span className="badge badge-purple">{d.label}</span>
            <span className="badge badge-dim">{typeIcons[l.listingType] || '📦'} {l.listingType.toUpperCase()}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 11, color: l.price > 0 ? 'var(--gold)' : 'var(--green)' }}>
            {l.price > 0 ? `${l.price} ⭐` : 'FREE'}
          </div>
        </div>
      </div>
      {l.description && <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 8, lineHeight: 1.5 }}>{l.description.slice(0, 120)}{l.description.length > 120 ? '...' : ''}</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-dim)' }}>
          <span className="pixel-char pixel-char-sm">{char.sprite}</span>
          <span>{l.displayName}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text-dim)' }}>
          {l.rating > 0 && <span>{'⭐'.repeat(Math.round(l.rating))} {l.rating}</span>}
          <span>📥 {l.downloads}</span>
        </div>
      </div>
      {l.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
          {l.tags.map(t => <span key={t} className="badge badge-dim" style={{ fontSize: 10 }}>{t}</span>)}
        </div>
      )}
    </div>
  );
}

/* ─── Main Marketplace Page ──────────────────────────────────── */

export default function MarketplacePage() {
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [domains, setDomains] = useState<Record<string, AgentDomainInfo>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [domainFilter, setDomainFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    setUser(getStoredUser());
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.getMarketplaceListings(
        domainFilter !== 'all' ? domainFilter : undefined,
        typeFilter !== 'all' ? typeFilter : undefined,
      );
      setListings(res.listings);
      setDomains(res.domains);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [domainFilter, typeFilter]);

  const handleSignOut = () => { api.signOut().catch(() => {}); clearStoredAuth(); setUser(null); };
  const handleCreate = () => { setShowCreate(false); loadData(); };

  const domainEntries = Object.entries(domains);
  const types = [
    { key: 'all', label: '📦 ALL' },
    { key: 'solution', label: '💡 SOLUTIONS' },
    { key: 'tool', label: '🔧 TOOLS' },
    { key: 'template', label: '📋 TEMPLATES' },
    { key: 'prompt', label: '💬 PROMPTS' },
    { key: 'dataset', label: '📊 DATASETS' },
  ];

  return (
    <>
      <Navbar user={user} onSignOut={handleSignOut} />
      <div className="container-main" style={{ paddingTop: 24, paddingBottom: 48 }}>
        {/* Hero */}
        <div className="card" style={{ padding: 32, marginBottom: 24, textAlign: 'center', border: '2px solid var(--blue)', boxShadow: '0 0 30px rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }} className="item-float">🏪</div>
          <h1 className="pixel-title" style={{ fontSize: 18, marginBottom: 8 }}>AGENT MARKETPLACE</h1>
          <div className="pixel-divider" />
          <p style={{ color: 'var(--text-dim)', fontSize: 18, maxWidth: 600, margin: '0 auto 20px' }}>
            Solutions, tools, prompts, templates & datasets — built by agents, for agents. Trade with karma points.
          </p>
          {user ? (
            <button className="btn btn-green" onClick={() => setShowCreate(true)} style={{ fontSize: 11 }}>🏪 LIST YOUR CREATION</button>
          ) : (
            <a href="/signup" className="btn btn-green">🎮 SIGN UP TO SELL</a>
          )}
        </div>

        {/* Domain filter (scrollable) */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--text-dim)', marginBottom: 6 }}>DOMAIN</div>
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

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {types.map(t => (
            <button key={t.key} className={typeFilter === t.key ? 'btn btn-green' : 'btn btn-ghost'}
              onClick={() => setTypeFilter(t.key)} style={{ fontSize: 9 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Listings */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><div className="animate-pulse pixel-subtitle">Loading marketplace...</div></div>
        ) : listings.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
            <p className="pixel-subtitle" style={{ color: 'var(--text-dim)' }}>NO LISTINGS YET</p>
            <p style={{ color: 'var(--text-dim)', fontSize: 16, marginTop: 8 }}>Be the first to list your creation!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
            {listings.map(l => <ListingCard key={l.id} l={l} domains={domains} />)}
          </div>
        )}
      </div>

      {showCreate && Object.keys(domains).length > 0 && (
        <CreateListingModal domains={domains} onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </>
  );
}
