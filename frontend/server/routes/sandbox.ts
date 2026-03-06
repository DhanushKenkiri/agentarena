import { Router, Request, Response } from 'express';
import { authMiddleware, requireAuth } from '../auth';
import {
  dbGetUser, dbUpdateUser,
  dbInsertTournament, dbGetTournament, dbUpdateTournament,
  dbGetAllTournaments,
  dbInsertTournamentPlayer, dbGetTournamentPlayer, dbGetTournamentPlayers,
  dbInsertChatMessage, dbGetChatMessages,
  dbInsertActivityEvent,
  type Tournament,
} from '../db';
import {
  dbInsertSandboxChallenge, dbGetSandboxChallenges,
  dbInsertSandboxSubmission, dbGetSandboxSubmissions, dbGetSandboxSubmission,
  dbInsertSandboxVote, dbGetSandboxVotes, dbFindSandboxVote,
  type SandboxChallenge, type SandboxSubmission,
} from '../sandbox-db';

const router = Router();

// ─── List sandbox tournaments ──────────────────────────────────

router.get('/tournaments', (_req: Request, res: Response) => {
  try {
    const all = dbGetAllTournaments();
    const sandboxTournaments = all.filter(t =>
      t.mode === 'code' || t.mode === 'design' || t.mode === 'creative'
    );
    res.json({ ok: true, tournaments: sandboxTournaments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Create sandbox tournament ─────────────────────────────────

router.post('/tournaments', authMiddleware, requireAuth, (req: Request, res: Response) => {
  try {
    const { name, description, mode, duration, maxPlayers, challenges } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Tournament name required' });
      return;
    }
    if (!mode || !['code', 'design', 'creative'].includes(mode)) {
      res.status(400).json({ error: 'Mode must be code, design, or creative' });
      return;
    }
    if (!challenges || !Array.isArray(challenges) || challenges.length === 0) {
      res.status(400).json({ error: 'At least one challenge is required' });
      return;
    }
    if (challenges.length > 10) {
      res.status(400).json({ error: 'Maximum 10 challenges per tournament' });
      return;
    }

    // Validate challenges
    for (const ch of challenges) {
      if (!ch.title || !ch.prompt) {
        res.status(400).json({ error: 'Each challenge needs a title and prompt' });
        return;
      }
    }

    const now = new Date();
    const dur = Math.min(Math.max(duration || 60, 10), 480); // 10min–8hr
    const endsAt = new Date(now.getTime() + dur * 60000);

    const tournament = dbInsertTournament({
      name,
      description: description || '',
      status: 'waiting',
      category: mode === 'code' ? 'JavaScript' : mode === 'design' ? 'Design' : 'Creative',
      mode: mode as any,
      startsAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      duration: dur,
      roundDuration: dur * 60, // entire duration in seconds
      totalRounds: challenges.length,
      maxPlayers: Math.min(maxPlayers || 50, 100),
      createdBy: req.user!.id,
    });

    // Insert challenges
    for (let i = 0; i < challenges.length; i++) {
      const ch = challenges[i];
      dbInsertSandboxChallenge({
        tournamentId: tournament.id,
        order: i + 1,
        title: ch.title.slice(0, 200),
        prompt: ch.prompt.slice(0, 5000),
        mode: mode,
        // Code challenges can have test cases
        testCases: mode === 'code' && ch.testCases ? ch.testCases.slice(0, 10).map((tc: any) => ({
          input: String(tc.input || '').slice(0, 1000),
          expectedOutput: String(tc.expectedOutput || '').slice(0, 1000),
        })) : [],
        // Design challenges can have reference/requirements
        requirements: ch.requirements || '',
        timeLimit: Math.min(Math.max(ch.timeLimit || (dur * 60 / challenges.length), 60), 7200),
        maxScore: 100,
      });
    }

    // Auto-join creator
    dbInsertTournamentPlayer(tournament.id, req.user!.id);

    const user = dbGetUser(req.user!.id);
    if (user) {
      dbInsertActivityEvent({
        type: 'join',
        userId: user.id,
        username: user.displayName || user.username,
        character: user.character,
        message: `${user.displayName || user.username} created a ${mode} sandbox: ${name}`,
        metadata: { tournamentId: tournament.id, mode },
      });
    }

    res.json({ ok: true, tournament, challenges: dbGetSandboxChallenges(tournament.id) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Get sandbox tournament detail ─────────────────────────────

router.get('/tournaments/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const tournament = dbGetTournament(id);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    const players = dbGetTournamentPlayers(id);
    const challenges = dbGetSandboxChallenges(id);
    const submissions = dbGetSandboxSubmissions(id);
    const votes = dbGetSandboxVotes(id);
    const messages = dbGetChatMessages(id, 50);

    // Calculate scores per player
    const playerScores: Record<number, { score: number; submissions: number; avgVote: number }> = {};
    for (const p of players) {
      const playerSubs = submissions.filter(s => s.userId === p.userId);
      const playerVotes = votes.filter(v => playerSubs.some(s => s.id === v.submissionId));
      const avgVote = playerVotes.length > 0
        ? playerVotes.reduce((a, b) => a + b.score, 0) / playerVotes.length
        : 0;
      playerScores[p.userId] = {
        score: Math.round(avgVote * 10 + playerSubs.length * 5),
        submissions: playerSubs.length,
        avgVote: Math.round(avgVote * 10) / 10,
      };
    }

    res.json({
      ok: true,
      tournament,
      players,
      challenges,
      submissions: submissions.map(s => ({
        ...s,
        // Don't send code/content in list view for large tournaments
        code: s.code.length > 5000 ? s.code.slice(0, 5000) + '\n// ... truncated ...' : s.code,
      })),
      votes,
      messages,
      playerScores,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Join sandbox tournament ───────────────────────────────────

router.post('/tournaments/:id/join', authMiddleware, requireAuth, (req: Request, res: Response) => {
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

// ─── Start sandbox tournament ──────────────────────────────────

router.post('/tournaments/:id/start', authMiddleware, requireAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const tournament = dbGetTournament(id);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }
    if (tournament.createdBy !== req.user!.id) {
      res.status(403).json({ error: 'Only the creator can start' });
      return;
    }
    if (tournament.status !== 'waiting') {
      res.status(400).json({ error: 'Tournament already started' });
      return;
    }

    const now = new Date();
    dbUpdateTournament(id, {
      status: 'active',
      startsAt: now.toISOString(),
      endsAt: new Date(now.getTime() + tournament.duration * 60000).toISOString(),
    });

    res.json({ ok: true, tournament: dbGetTournament(id) });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Submit to sandbox challenge ───────────────────────────────

router.post('/tournaments/:id/submit', authMiddleware, requireAuth, (req: Request, res: Response) => {
  try {
    const tournamentId = parseInt(req.params.id as string);
    const { challengeId, code, language } = req.body;

    if (!challengeId || code === undefined) {
      res.status(400).json({ error: 'challengeId and code are required' });
      return;
    }

    const tournament = dbGetTournament(tournamentId);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }
    if (tournament.status !== 'active') {
      res.status(400).json({ error: 'Tournament is not active' });
      return;
    }

    const player = dbGetTournamentPlayer(tournamentId, req.user!.id);
    if (!player) {
      res.status(403).json({ error: 'You must join the tournament first' });
      return;
    }

    const challenges = dbGetSandboxChallenges(tournamentId);
    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge) {
      res.status(404).json({ error: 'Challenge not found' });
      return;
    }

    // Code size limit: 50KB
    const codeStr = String(code).slice(0, 50000);

    // For code challenges, run test cases
    let testResults: { input: string; expected: string; actual: string; passed: boolean }[] = [];
    let autoScore = 0;

    if (challenge.mode === 'code' && challenge.testCases.length > 0) {
      for (const tc of challenge.testCases) {
        try {
          // Safe-ish evaluation using Function constructor (sandboxed on frontend too)
          const fn = new Function('input', codeStr + '\n; return typeof solution === "function" ? solution(input) : undefined;');
          let result: any;
          try {
            result = fn(tc.input);
          } catch (e: any) {
            result = `Error: ${e.message}`;
          }
          const actual = String(result);
          const passed = actual.trim() === tc.expectedOutput.trim();
          testResults.push({ input: tc.input, expected: tc.expectedOutput, actual, passed });
          if (passed) autoScore += Math.floor(100 / challenge.testCases.length);
        } catch (e: any) {
          testResults.push({ input: tc.input, expected: tc.expectedOutput, actual: `Error: ${e.message}`, passed: false });
        }
      }
    }

    const submission = dbInsertSandboxSubmission({
      tournamentId,
      challengeId,
      userId: req.user!.id,
      code: codeStr,
      language: language || (challenge.mode === 'code' ? 'javascript' : challenge.mode === 'design' ? 'html' : 'text'),
      testResults,
      autoScore,
      peerScore: 0,
      finalScore: autoScore,
      submittedAt: new Date().toISOString(),
    });

    const user = dbGetUser(req.user!.id);
    if (user) {
      dbInsertActivityEvent({
        type: 'join',
        userId: user.id,
        username: user.displayName || user.username,
        character: user.character,
        message: `${user.displayName || user.username} submitted to "${challenge.title}" in ${tournament.name}`,
        metadata: { tournamentId, challengeId, mode: challenge.mode },
      });
    }

    res.json({ ok: true, submission, testResults });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Get a specific submission ─────────────────────────────────

router.get('/tournaments/:id/submissions/:subId', (req: Request, res: Response) => {
  try {
    const subId = parseInt(req.params.subId as string);
    const submission = dbGetSandboxSubmission(subId);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    const votes = dbGetSandboxVotes(submission.tournamentId).filter(v => v.submissionId === subId);
    res.json({ ok: true, submission, votes });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Vote/Judge a submission ───────────────────────────────────

router.post('/tournaments/:id/vote', authMiddleware, requireAuth, (req: Request, res: Response) => {
  try {
    const tournamentId = parseInt(req.params.id as string);
    const { submissionId, score, comment } = req.body;

    if (!submissionId || score === undefined) {
      res.status(400).json({ error: 'submissionId and score are required' });
      return;
    }

    const numScore = Math.min(Math.max(Number(score), 0), 10);

    const tournament = dbGetTournament(tournamentId);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    const submission = dbGetSandboxSubmission(submissionId);
    if (!submission || submission.tournamentId !== tournamentId) {
      res.status(404).json({ error: 'Submission not found in this tournament' });
      return;
    }

    // Can't vote on own submission
    if (submission.userId === req.user!.id) {
      res.status(400).json({ error: 'Cannot vote on your own submission' });
      return;
    }

    // Check if already voted
    const existing = dbFindSandboxVote(submissionId, req.user!.id);
    if (existing) {
      res.status(400).json({ error: 'Already voted on this submission' });
      return;
    }

    const player = dbGetTournamentPlayer(tournamentId, req.user!.id);
    if (!player) {
      res.status(403).json({ error: 'Must be a tournament participant to vote' });
      return;
    }

    const vote = dbInsertSandboxVote({
      tournamentId,
      submissionId,
      voterId: req.user!.id,
      score: numScore,
      comment: comment ? String(comment).slice(0, 500) : '',
      votedAt: new Date().toISOString(),
    });

    // Recalculate peer score for this submission
    const allVotes = dbGetSandboxVotes(tournamentId).filter(v => v.submissionId === submissionId);
    const avgPeerScore = allVotes.length > 0
      ? allVotes.reduce((a, b) => a + b.score, 0) / allVotes.length
      : 0;
    // Update submission's peer score and final score
    const { dbUpdateSandboxSubmission } = require('../sandbox-db');
    dbUpdateSandboxSubmission(submissionId, {
      peerScore: Math.round(avgPeerScore * 10) / 10,
      finalScore: submission.autoScore + Math.round(avgPeerScore * 10),
    });

    res.json({ ok: true, vote });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Finish sandbox tournament ─────────────────────────────────

router.post('/tournaments/:id/finish', authMiddleware, requireAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const tournament = dbGetTournament(id);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }
    if (tournament.createdBy !== req.user!.id) {
      res.status(403).json({ error: 'Only the creator can finish' });
      return;
    }

    const submissions = dbGetSandboxSubmissions(id);
    const votes = dbGetSandboxVotes(id);
    const players = dbGetTournamentPlayers(id);

    // Calculate final scores per player
    let bestPlayer = { userId: 0, score: 0, name: '' };
    for (const p of players) {
      const playerSubs = submissions.filter(s => s.userId === p.userId);
      let totalScore = 0;
      for (const s of playerSubs) {
        const subVotes = votes.filter(v => v.submissionId === s.id);
        const avgVote = subVotes.length > 0
          ? subVotes.reduce((a, b) => a + b.score, 0) / subVotes.length
          : 0;
        totalScore += s.autoScore + Math.round(avgVote * 10);
      }
      if (totalScore > bestPlayer.score) {
        bestPlayer = { userId: p.userId, score: totalScore, name: p.displayName || p.username };
      }
    }

    dbUpdateTournament(id, {
      status: 'finished',
      winnerId: bestPlayer.userId,
      winnerName: bestPlayer.name,
      endsAt: new Date().toISOString(),
    });

    if (bestPlayer.userId) {
      const winner = dbGetUser(bestPlayer.userId);
      if (winner) {
        dbUpdateUser(winner.id, {
          gamesWon: winner.gamesWon + 1,
          totalScore: winner.totalScore + bestPlayer.score,
        });
        dbInsertActivityEvent({
          type: 'win',
          userId: winner.id,
          username: winner.displayName || winner.username,
          character: winner.character,
          message: `${winner.displayName || winner.username} won the ${tournament.mode} sandbox "${tournament.name}" with ${bestPlayer.score} pts!`,
          metadata: { tournamentId: id, mode: tournament.mode },
        });
      }
    }

    // Update games played for all players
    for (const p of players) {
      const u = dbGetUser(p.userId);
      if (u) {
        dbUpdateUser(u.id, { gamesPlayed: u.gamesPlayed + 1 });
      }
    }

    res.json({ ok: true, tournament: dbGetTournament(id), winner: bestPlayer });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Chat in sandbox tournament ────────────────────────────────

router.post('/tournaments/:id/chat', authMiddleware, requireAuth, (req: Request, res: Response) => {
  try {
    const tournamentId = parseInt(req.params.id as string);
    const { message } = req.body;
    if (!message || message.length > 500) {
      res.status(400).json({ error: 'Message required (max 500 chars)' });
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

export default router;
