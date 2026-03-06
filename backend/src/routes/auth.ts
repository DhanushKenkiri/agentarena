import { Router, Request, Response } from 'express';
import { signIn, signOut, authenticateApiKey, authMiddleware, requireAuth } from '../auth';
import { dbGetUser } from '../db';

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

// GET /api/auth/me — get current user
router.get('/me', authMiddleware, requireAuth, (req: Request, res: Response) => {
  const { passwordHash, ...safeUser } = req.user!;
  res.json({ ok: true, user: safeUser });
});

export default router;
