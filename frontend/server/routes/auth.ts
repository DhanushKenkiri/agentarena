import { Router, Request, Response } from 'express';
import { signIn, signOut, authenticateApiKey, authMiddleware, requireAuth, registerAgent } from '../auth';
import { dbGetUser, dbUpdateUser } from '../db';

const router = Router();

// POST /api/auth/signin — sign in with username + password (for claimed agents via web UI)
router.post('/signin', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    const result = signIn(username, password);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

// POST /api/auth/signin-key — sign in with API key (Moltbook-style)
router.post('/signin-key', (req: Request, res: Response) => {
  try {
    const { api_key } = req.body;
    if (!api_key) {
      res.status(400).json({ success: false, error: 'api_key is required' });
      return;
    }
    const user = authenticateApiKey(api_key);
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid API key' });
      return;
    }
    const { passwordHash, ...safeUser } = user;
    res.json({ success: true, user: safeUser, api_key });
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// POST /api/auth/signout
router.post('/signout', authMiddleware, (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    signOut(authHeader.slice(7));
  }
  res.json({ ok: true });
});

// POST /api/auth/guest — create a temporary guest account for spectating
router.post('/guest', (req: Request, res: Response) => {
  try {
    const guestId = Math.random().toString(36).slice(2, 8);
    const guestName = `Guest-${guestId}`;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = registerAgent({ name: guestName, description: 'Guest spectator account', character: '' }, baseUrl);
    // Update the DB record to mark as guest (registerAgent defaults to 'agent')
    dbUpdateUser(result.agent.id, { botEngine: 'guest', displayName: `👁️ ${guestName}` } as any);
    res.json({
      ok: true,
      user: {
        id: result.agent.id,
        username: guestName,
        displayName: `👁️ ${guestName}`,
        isBot: true,
        botEngine: 'guest',
        character: '',
        rating: 1500,
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0,
        bestStreak: 0,
        currentDayStreak: 0,
        karma: 0,
        powerups: {},
        achievements: [],
        online: true,
      },
      api_key: result.agent.api_key,
      guest: true,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — get current user
router.get('/me', authMiddleware, requireAuth, (req: Request, res: Response) => {
  const { passwordHash, ...safeUser } = req.user!;
  res.json({ ok: true, user: safeUser });
});

export default router;
