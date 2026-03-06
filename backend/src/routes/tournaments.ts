import { Router, Request, Response } from 'express';
import { authMiddleware, requireAuth } from '../auth';
import {
  dbInsertTournament, dbGetTournament, dbGetAllTournaments, dbGetActiveTournaments,
  dbInsertTournamentPlayer, dbGetTournamentPlayer, dbGetTournamentPlayers,
  dbGetTournamentRounds, dbGetCurrentRound, dbGetRound,
  dbGetRoundAnswers, dbGetChatMessages, dbInsertChatMessage,
  dbUpdateTournament,
} from '../db';
import { startTournament, createNextRound, submitAnswer, scoreRound, finishTournament, createBlitzMatch, getHintForRound } from '../tournament';
import { CHALLENGE_CATEGORIES } from '../challenges';

const router = Router();

// GET /api/tournaments — list all tournaments
router.get('/', (_req: Request, res: Response) => {
  try {
    const tournaments = dbGetAllTournaments();
    res.json({ ok: true, tournaments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tournaments/active — active and upcoming
router.get('/active', (_req: Request, res: Response) => {
  try {
    const tournaments = dbGetActiveTournaments();
    res.json({ ok: true, tournaments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tournaments/categories — challenge categories
router.get('/categories', (_req: Request, res: Response) => {
  res.json({ ok: true, categories: CHALLENGE_CATEGORIES });
});

// POST /api/tournaments — create a tournament
router.post('/', authMiddleware, requireAuth, (req: Request, res: Response) => {
  try {
    const { name, description, category, duration, roundDuration, totalRounds, maxPlayers, startsAt, mode } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Tournament name is required' });
      return;
    }

    const now = new Date();
    const scheduledStart = startsAt ? new Date(startsAt) : new Date(now.getTime() + 5 * 60000);
    const dur = duration || 30;
    const endsAt = new Date(scheduledStart.getTime() + dur * 60000);

    const tournament = dbInsertTournament({
      name,
      description: description || '',
      status: 'waiting',
      category: category || 'Mixed',
      mode: mode || 'arena',
      startsAt: scheduledStart.toISOString(),
      endsAt: endsAt.toISOString(),
      duration: dur,
      roundDuration: roundDuration || 30,
      totalRounds: totalRounds || 15,
      maxPlayers: maxPlayers || 100,
      createdBy: req.user!.id,
    });

    dbInsertTournamentPlayer(tournament.id, req.user!.id);

    res.json({ ok: true, tournament });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/tournaments/blitz — create a blitz quick match
router.post('/blitz', authMiddleware, requireAuth, (req: Request, res: Response) => {
  try {
    const tournament = createBlitzMatch(req.user!.id);
    res.json({ ok: true, tournament });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/tournaments/:id — tournament detail
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const tournament = dbGetTournament(id);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    const players = dbGetTournamentPlayers(id);
    const rounds = dbGetTournamentRounds(id);
    const currentRound = dbGetCurrentRound(id);

    // Prepare challenge data (hide answer for active rounds)
    let activeChallenge = null;
    if (currentRound && currentRound.status === 'active') {
      activeChallenge = {
        roundId: currentRound.id,
        roundNumber: currentRound.roundNumber,
        category: currentRound.challengeCategory,
        question: currentRound.challengeQuestion,
        options: currentRound.challengeOptions,
        difficulty: currentRound.challengeDifficulty,
        startsAt: currentRound.startsAt,
        endsAt: currentRound.endsAt,
        // NOTE: correctAnswer NOT sent to clients
      };
    }

    // Recent chat
    const messages = dbGetChatMessages(id, 50);

    // Round results (only scored rounds)
    const roundResults = rounds
      .filter(r => r.status === 'scored')
      .map(r => ({
        roundNumber: r.roundNumber,
        category: r.challengeCategory,
        question: r.challengeQuestion,
        correctAnswer: r.challengeCorrectAnswer,
        explanation: r.challengeExplanation,
        answers: dbGetRoundAnswers(r.id),
      }));

    res.json({
      ok: true,
      tournament,
      players,
      rounds: rounds.map(r => ({
        id: r.id,
        roundNumber: r.roundNumber,
        category: r.challengeCategory,
        status: r.status,
        startsAt: r.startsAt,
        endsAt: r.endsAt,
      })),
      activeChallenge,
      roundResults: roundResults.slice(-5), // last 5 round results
      messages,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tournaments/:id/join — join tournament
router.post('/:id/join', authMiddleware, requireAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const tournament = dbGetTournament(id);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }
    if (tournament.status === 'finished') {
      res.status(400).json({ error: 'Tournament has ended' });
      return;
    }
    if (tournament.playerCount >= tournament.maxPlayers) {
      res.status(400).json({ error: 'Tournament is full' });
      return;
    }

    const existing = dbGetTournamentPlayer(id, req.user!.id);
    if (existing) {
      res.json({ ok: true, message: 'Already joined', player: existing });
      return;
    }

    const player = dbInsertTournamentPlayer(id, req.user!.id);
    res.json({ ok: true, player });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/tournaments/:id/answer — submit answer for current round
router.post('/:id/answer', authMiddleware, requireAuth, (req: Request, res: Response) => {
  try {
    const tournamentId = parseInt(req.params.id as string);
    const { roundId, answer, powerup } = req.body;

    if (!roundId || !answer) {
      res.status(400).json({ error: 'roundId and answer are required' });
      return;
    }

    const result = submitAnswer(tournamentId, req.user!.id, roundId, answer, powerup);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/tournaments/:id/hint — use hint power-up to get filtered options
router.post('/:id/hint', authMiddleware, requireAuth, (req: Request, res: Response) => {
  try {
    const { roundId } = req.body;
    if (!roundId) {
      res.status(400).json({ error: 'roundId is required' });
      return;
    }
    const result = getHintForRound(roundId, req.user!.id);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/tournaments/:id/chat — send chat message
router.post('/:id/chat', authMiddleware, requireAuth, (req: Request, res: Response) => {
  try {
    const tournamentId = parseInt(req.params.id as string);
    const { message } = req.body;

    if (!message || message.length > 300) {
      res.status(400).json({ error: 'Message required (max 300 chars)' });
      return;
    }

    const tournament = dbGetTournament(tournamentId);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    const msg = dbInsertChatMessage(tournamentId, req.user!.id, req.user!.displayName || req.user!.username, message);
    res.json({ ok: true, message: msg });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/tournaments/:id/start — start tournament (creator or admin)
router.post('/:id/start', authMiddleware, requireAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const tournament = dbGetTournament(id);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }
    if (tournament.createdBy !== req.user!.id) {
      res.status(403).json({ error: 'Only the creator can start the tournament' });
      return;
    }

    const result = startTournament(id);
    res.json({ ok: true, tournament: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/tournaments/:id/next-round — advance to next round (for admin/creator)
router.post('/:id/next-round', authMiddleware, requireAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const tournament = dbGetTournament(id);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    const round = createNextRound(id);
    if (!round) {
      res.json({ ok: true, message: 'Tournament finished', finished: true });
      return;
    }
    res.json({ ok: true, round });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/tournaments/:id/finish — end tournament early
router.post('/:id/finish', authMiddleware, requireAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const tournament = dbGetTournament(id);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }
    if (tournament.createdBy !== req.user!.id) {
      res.status(403).json({ error: 'Only the creator can end the tournament' });
      return;
    }

    finishTournament(id);
    res.json({ ok: true, message: 'Tournament finished' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
