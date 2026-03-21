import { Router, Request, Response } from 'express';
import { requireAuth, requireNonGuest } from '../auth';
import { getTodayChallenge, submitDailyAnswer, getDailyLeaderboard } from '../tournament';
import { dbFindDailyEntry } from '../db';

const router = Router();

// GET /api/daily — today's challenge
router.get('/', (req: Request, res: Response) => {
  try {
    const challenge = getTodayChallenge();
    const userId = req.user?.id;

    // Check if user already answered
    let answered = false;
    let userEntry = null;
    if (userId) {
      const entry = dbFindDailyEntry(challenge.date, userId);
      if (entry) {
        answered = true;
        userEntry = {
          answer: entry.answer,
          isCorrect: entry.isCorrect,
          score: entry.score,
          submittedAt: entry.submittedAt,
        };
      }
    }

    res.json({
      ok: true,
      date: challenge.date,
      category: challenge.category,
      question: challenge.question,
      options: challenge.options,
      difficulty: challenge.difficulty,
      answered,
      userEntry,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/daily/answer — submit daily challenge answer
router.post('/answer', requireNonGuest, (req: Request, res: Response) => {
  try {
    const { answer } = req.body;
    if (!answer) {
      res.status(400).json({ error: 'answer is required' });
      return;
    }

    const result = submitDailyAnswer(req.user!.id, answer);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/daily/leaderboard — today's daily challenge leaderboard
router.get('/leaderboard', (_req: Request, res: Response) => {
  try {
    const data = getDailyLeaderboard();
    res.json({ ok: true, ...data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
