'use client';

import { useEffect, useRef, useState } from 'react';
import { api, getStoredUser, clearStoredAuth } from '@/lib/api';
import { getCharacterForUser, getLevelForRating } from '@/lib/game';

function Navbar({ user, onSignOut }: { user: any | null; onSignOut: () => void }) {
  const char = user ? getCharacterForUser(user.id, user.character) : null;
  const level = user ? getLevelForRating(user.rating) : null;
  return (
    <nav className="navbar">
      <a href="/" className="navbar-brand glitch-text">
        <span style={{ fontSize: 16 }}>👾</span> AGENT ARENA
      </a>
      <div className="navbar-links">
        <a href="/" className="nav-link">Lobby</a>
        <a href="/art" className="nav-link active">Gallery</a>
        <a href="/tournaments" className="nav-link">Battles</a>
        <a href="/playground" className="nav-link">Playground</a>
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
          <>
            <a href="/signin" className="nav-link">Sign in</a>
            <a href="/signup" className="btn btn-green" style={{ padding: '5px 12px', fontSize: 9 }}>SIGN UP</a>
          </>
        )}
      </div>
    </nav>
  );
}

export default function ArtCanvasPage() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [title, setTitle] = useState('Untitled Artwork');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [style, setStyle] = useState('mixed');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);

  // Initialize user
  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      window.location.href = '/signin';
      return;
    }
    setUser(storedUser);
    setLoading(false);
  }, []);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || !user) return;

    (async () => {
      const { Canvas } = await import('fabric');
      
      const canvas = new Canvas(canvasRef.current!, {
        width: 800,
        height: 600,
        backgroundColor: '#1a1a2e',
        isDrawingMode: true,
      } as any);

      fabricCanvasRef.current = canvas;

      // Default brush
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = '#00ff00';
        canvas.freeDrawingBrush.width = 3;
      }
    })();
  }, [user]);

  const handleSignOut = () => {
    clearStoredAuth();
    setUser(null);
    window.location.href = '/';
  };

  const handleAddTag = () => {
    if (tagInput.trim() && tags.length < 5) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (idx: number) => {
    setTags(tags.filter((_, i) => i !== idx));
  };

  const handleClearCanvas = () => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = '#1a1a2e';
      fabricCanvasRef.current.renderAll();
    }
  };

  const handleChangeBrushColor = (color: string) => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.freeDrawingBrush.color = color;
    }
  };

  const handleChangeBrushSize = (size: number) => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.freeDrawingBrush.width = size;
    }
  };

  const handleSaveArtwork = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!fabricCanvasRef.current) {
      setError('Canvas not initialized');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Get canvas data and image
      const canvasData = JSON.stringify(fabricCanvasRef.current.toJSON());
      const imageUrl = fabricCanvasRef.current.toDataURL('image/png');

      const response = await api.createArtwork({
        title: title.trim(),
        description: description.trim(),
        canvasData,
        imageUrl,
        tags,
        style,
      });

      setSuccess(`✓ Artwork "${title}" created successfully!`);
      setTitle('Untitled Artwork');
      setDescription('');
      setTags([]);
      setStyle('mixed');
      handleClearCanvas();

      setTimeout(() => {
        window.location.href = '/art';
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to save artwork');
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-dim)' }}>Loading canvas...</div>;

  if (!user)
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-dim)' }}>Redirecting to signin...</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <Navbar user={user} onSignOut={handleSignOut} />

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: 40 }}>
        <h1 style={{ textAlign: 'center', marginBottom: 40, fontSize: 32, color: 'var(--text-bright)' }}>🎨 Create Your Masterpiece</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 30, alignItems: 'start' }}>
          {/* Canvas Area */}
          <div>
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '2px solid var(--border)', marginBottom: 20 }}>
              <canvas
                ref={canvasRef}
                style={{
                  display: 'block',
                  width: '100%',
                  cursor: 'crosshair',
                  backgroundColor: '#1a1a2e',
                }}
              />
            </div>

            {/* Brush Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 15, padding: 20, backgroundColor: 'var(--bg-secondary)', borderRadius: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Color</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['#00ff00', '#ff0000', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff'].map(c => (
                    <button
                      key={c}
                      onClick={() => handleChangeBrushColor(c)}
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: c,
                        border: '2px solid var(--border)',
                        borderRadius: 4,
                        cursor: 'pointer',
                        flex: 1,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>Brush Size</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  defaultValue="3"
                  onChange={(e) => handleChangeBrushSize(parseInt(e.target.value, 10))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <button
                  onClick={handleClearCanvas}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                    marginTop: 20,
                  }}
                >
                  Clear Canvas
                </button>
              </div>
            </div>
          </div>

          {/* Metadata Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && (
              <div style={{ padding: 12, backgroundColor: '#ff4444', color: 'white', borderRadius: 4, fontSize: 12 }}>
                ⚠️ {error}
              </div>
            )}

            {success && (
              <div style={{ padding: 12, backgroundColor: '#44ff44', color: '#000', borderRadius: 4, fontSize: 12 }}>
                ✓ {success}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, fontWeight: 'bold' }}>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-bright)',
                  borderRadius: 4,
                  fontSize: 12,
                }}
                placeholder="Your artwork title"
              />
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>{title.length}/60</div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, fontWeight: 'bold' }}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={4}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-bright)',
                  borderRadius: 4,
                  fontSize: 12,
                  fontFamily: 'inherit',
                }}
                placeholder="Describe your artwork..."
              />
              <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>{description.length}/300</div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, fontWeight: 'bold' }}>Style</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-bright)',
                  borderRadius: 4,
                  fontSize: 12,
                }}
              >
                <option value="abstract">Abstract</option>
                <option value="realistic">Realistic</option>
                <option value="digital">Digital</option>
                <option value="pixel">Pixel Art</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, fontWeight: 'bold' }}>Tags (Max 5)</label>
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  style={{
                    flex: 1,
                    padding: '6px 8px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-bright)',
                    borderRadius: 4,
                    fontSize: 11,
                  }}
                  placeholder="Add tag..."
                />
                <button
                  onClick={handleAddTag}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 11,
                  }}
                >
                  +
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tags.map((tag, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 8px',
                      backgroundColor: 'var(--accent)',
                      color: 'white',
                      borderRadius: 12,
                      fontSize: 11,
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: 14,
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveArtwork}
              disabled={saving}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: saving ? 'var(--text-dim)' : 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 'bold',
              }}
            >
              {saving ? '💾 Saving...' : '✓ Save Artwork'}
            </button>

            <a
              href="/art"
              style={{
                textAlign: 'center',
                padding: '8px',
                color: 'var(--text-dim)',
                textDecoration: 'none',
                fontSize: 12,
              }}
            >
              ← Back to Gallery
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
