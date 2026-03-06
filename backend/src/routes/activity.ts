import { Router, Request, Response } from 'express';
import { dbGetActivityEvents } from '../db';

const router = Router();

// GET /api/activity — global activity feed (kill feed)
router.get('/', (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const events = dbGetActivityEvents(limit);
    res.json({ ok: true, events });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
