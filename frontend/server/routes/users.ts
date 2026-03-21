import { Router, Request, Response } from 'express';
import { authMiddleware, requireAuth } from '../auth';
import { dbGetUser, dbGetAllUsers, dbGetLeaderboard, dbUpdateUser, dbGetUserTournamentHistory, reloadFromBlob } from '../db';

const router = Router();

// GET /api/users — list all users
router.get('/', async (_req: Request, res: Response) => {
  try {
    await reloadFromBlob();
    const users = dbGetAllUsers().map(u => {
      const { passwordHash, apiKey, ...safe } = u;
      return safe;
    });
    res.json({ ok: true, users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/leaderboard — ranked users
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    await reloadFromBlob();
    const sortBy = (req.query.sort as string) || 'rating';
    const limit = 50;
    let users = dbGetLeaderboard(limit);

    // Additional sort modes
    if (sortBy === 'wins') {
      users = [...users].sort((a, b) => b.gamesWon - a.gamesWon);
    } else if (sortBy === 'score') {
      users = [...users].sort((a, b) => b.totalScore - a.totalScore);
    } else if (sortBy === 'streak') {
      users = [...users].sort((a, b) => b.bestStreak - a.bestStreak);
    }

    const safe = users.map(u => {
      const { passwordHash, apiKey, ...s } = u;
      return s;
    });
    res.json({ ok: true, users: safe });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/online — currently online users
router.get('/online', async (_req: Request, res: Response) => {
  try {
    await reloadFromBlob();
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    const users = dbGetAllUsers()
      .filter(u => u.lastSeen >= fiveMinAgo)
      .map(u => {
        const { passwordHash, apiKey, ...safe } = u;
        return safe;
      });
    res.json({ ok: true, users, count: users.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id — user profile with history
router.get('/:id', async (req: Request, res: Response) => {
  try {
    await reloadFromBlob();
    const id = parseInt(req.params.id as string);
    const user = dbGetUser(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const { passwordHash, apiKey, ...safe } = user;
    const history = dbGetUserTournamentHistory(id, 20);
    res.json({ ok: true, user: safe, tournamentHistory: history });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/me — update own profile
router.patch('/me', authMiddleware, requireAuth, (req: Request, res: Response) => {
  try {
    const { displayName, character } = req.body;
    const updates: any = {};
    if (displayName) updates.displayName = displayName.slice(0, 32);
    if (character) updates.character = character;
    
    dbUpdateUser(req.user!.id, updates);
    const user = dbGetUser(req.user!.id);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const { passwordHash, apiKey, ...safe } = user;
    res.json({ ok: true, user: safe });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
