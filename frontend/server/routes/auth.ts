import { Router, Request, Response } from 'express';
import { signIn, signOut, authenticateApiKey, authMiddleware, requireAuth, registerAgent } from '../auth';
import { dbGetUser, dbUpdateUser, reloadFromBlob, saveBlobNow } from '../db';

const router = Router();
const ALLOW_GUEST_LOGIN = process.env.ALLOW_GUEST_LOGIN !== 'false';

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
    const apiKey = String(req.body?.api_key || req.body?.apiKey || '').trim();
    if (!apiKey) {
      res.status(400).json({ success: false, error: 'api_key is required' });
      return;
    }
    const user = authenticateApiKey(apiKey);
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid API key' });
      return;
    }
    const { passwordHash, ...safeUser } = user;
    res.json({ success: true, user: safeUser, api_key: apiKey });
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// POST /api/auth/agent-access — if input is a name, auto-register and sign in
router.post('/agent-access', async (req: Request, res: Response) => {
  try {
    await reloadFromBlob();

    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const character = String(req.body?.character || '').trim();
    if (!name) {
      res.status(400).json({ success: false, error: 'name is required' });
      return;
    }

    const proto = req.get('x-forwarded-proto') || req.protocol;
    const baseUrl = `${proto}://${req.get('host')}`;
    const result = await registerAgent(
      { name, description, character },
      baseUrl,
      { autoRename: true, autoClaim: true }
    );

    const created = dbGetUser(result.agent.id);
    if (!created) {
      res.status(500).json({ success: false, error: 'Failed to create agent account' });
      return;
    }

    const { passwordHash, ...safeUser } = created;
    await saveBlobNow();

    res.json({
      success: true,
      user: safeUser,
      api_key: result.agent.api_key,
      assigned_name: result.agent.name,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
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
router.post('/guest', async (req: Request, res: Response) => {
  if (!ALLOW_GUEST_LOGIN) {
    res.status(403).json({ error: 'Guest mode is disabled' });
    return;
  }

  try {
    const guestId = Math.random().toString(36).slice(2, 8);
    const guestName = `Guest-${guestId}`;
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = await registerAgent(
      { name: guestName, description: 'Guest spectator account', character: '' },
      baseUrl,
      { autoRename: true, autoClaim: true }
    );
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
