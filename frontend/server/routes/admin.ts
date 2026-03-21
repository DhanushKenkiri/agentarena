import { Router, Request, Response } from 'express';
import { tickTournaments, startTournament, createNextRound, finishTournament } from '../tournament';
import { dbGetAllTournaments, dbGetAllUsers, resetDb, dbGetActiveTournaments, dbPurgeUsersAndRelated, saveBlobNow, reloadFromBlob } from '../db';
import { getSeedAgentNames } from '../seed';

const router = Router();

const ADMIN_KEY = process.env.ADMIN_KEY || 'agentarena-admin-2024';

function requireAdmin(req: Request, res: Response, next: Function) {
  const key = req.headers['x-admin-key'] || req.query.adminKey;
  if (key !== ADMIN_KEY) {
    res.status(403).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

// GET /api/admin/status — system overview
router.get('/status', requireAdmin, (_req: Request, res: Response) => {
  try {
    const users = dbGetAllUsers();
    const tournaments = dbGetAllTournaments();
    const active = dbGetActiveTournaments();
    res.json({
      ok: true,
      totalUsers: users.length,
      totalBots: users.filter(u => u.isBot).length,
      totalTournaments: tournaments.length,
      activeTournaments: active.length,
      onlineUsers: users.filter(u => u.lastSeen >= new Date(Date.now() - 5 * 60000).toISOString()).length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/tick — manually trigger tournament tick
router.post('/tick', requireAdmin, (_req: Request, res: Response) => {
  try {
    tickTournaments();
    res.json({ ok: true, message: 'Tick executed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/start-tournament/:id
router.post('/start-tournament/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const t = startTournament(id);
    res.json({ ok: true, tournament: t });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/next-round/:id
router.post('/next-round/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const round = createNextRound(id);
    res.json({ ok: true, round });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/finish-tournament/:id
router.post('/finish-tournament/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    finishTournament(id);
    res.json({ ok: true, message: 'Tournament finished' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/admin/reset — reset all data (DANGEROUS)
router.post('/reset', requireAdmin, (_req: Request, res: Response) => {
  try {
    resetDb();
    res.json({ ok: true, message: 'Database reset' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/cleanup-production — remove seeded/demo users and related data
router.post('/cleanup-production', requireAdmin, async (_req: Request, res: Response) => {
  try {
    await reloadFromBlob();

    const seedNames = new Set(getSeedAgentNames().map(n => n.toLowerCase()));
    const users = dbGetAllUsers();

    const purgeIds = users
      .filter(u => {
        const isSeeded = seedNames.has(u.username.toLowerCase());
        const isGuest = u.botEngine === 'guest' || u.username.startsWith('Guest-');
        return isSeeded || isGuest;
      })
      .map(u => u.id);

    const summary = dbPurgeUsersAndRelated(purgeIds);
    await saveBlobNow();

    res.json({
      ok: true,
      message: 'Production cleanup complete',
      purgedUserIds: purgeIds.length,
      ...summary,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
