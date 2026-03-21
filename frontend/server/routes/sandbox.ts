import { Router, Request, Response } from 'express';
import { authMiddleware, requireAuth, requireNonGuest } from '../auth';
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
  AGENT_DOMAINS,
  dbInsertSandboxChallenge, dbGetSandboxChallenges,
  dbInsertSandboxSubmission, dbGetSandboxSubmissions, dbGetSandboxSubmission, dbUpdateSandboxSubmission,
  dbInsertSandboxVote, dbGetSandboxVotes, dbFindSandboxVote,
  dbInsertEvaluationCriterion, dbGetEvaluationCriteria,
  dbInsertMarketplaceListing, dbGetAllMarketplaceListings, dbGetMarketplaceListing, dbUpdateMarketplaceListing,
  dbInsertMarketplaceReview, dbGetMarketplaceReviews, dbFindMarketplaceReview,
  type SandboxChallenge, type SandboxSubmission,
} from '../sandbox-db';

const router = Router();

// ─── Get available domains ─────────────────────────────────────

router.get('/domains', (_req: Request, res: Response) => {
  res.json({ ok: true, domains: AGENT_DOMAINS });
});

// ─── List sandbox tournaments ──────────────────────────────────

router.get('/tournaments', (req: Request, res: Response) => {
  try {
    const all = dbGetAllTournaments();
    const domainKeys = Object.keys(AGENT_DOMAINS);
    const domainFilter = req.query.domain as string | undefined;
    const sandboxTournaments = all.filter(t => {
      const isSandbox = domainKeys.includes(t.mode);
      if (!isSandbox) return false;
      if (domainFilter && domainFilter !== 'all' && t.mode !== domainFilter) return false;
      return true;
    });
    res.json({ ok: true, tournaments: sandboxTournaments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Create sandbox tournament ─────────────────────────────────

router.post('/tournaments', authMiddleware, requireNonGuest, (req: Request, res: Response) => {
  try {
    const { name, description, domain, duration, maxPlayers, challenges, evaluationCriteria } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Tournament name required' });
      return;
    }
    // Accept any domain key, fall back to 'general'
    const domainKey = (domain && Object.keys(AGENT_DOMAINS).includes(domain)) ? domain : 'general';
    const domainInfo = AGENT_DOMAINS[domainKey];

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

    // Validate evaluation criteria (optional but recommended)
    if (evaluationCriteria && !Array.isArray(evaluationCriteria)) {
      res.status(400).json({ error: 'evaluationCriteria must be an array' });
      return;
    }

    const now = new Date();
    const dur = Math.min(Math.max(duration || 60, 10), 480);
    const endsAt = new Date(now.getTime() + dur * 60000);

    const tournament = dbInsertTournament({
      name,
      description: description || '',
      status: 'waiting',
      category: domainInfo.label,
      mode: domainKey as any,
      startsAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      duration: dur,
      roundDuration: dur * 60,
      totalRounds: challenges.length,
      maxPlayers: Math.min(maxPlayers || 50, 100),
      createdBy: req.user!.id,
    });

    // Insert challenges — each challenge has its own sandbox type
    for (let i = 0; i < challenges.length; i++) {
      const ch = challenges[i];
      // Challenge sandbox type: override with ch.sandboxType, or derive from domain
      const challengeMode = ch.sandboxType || domainInfo.sandboxType;
      dbInsertSandboxChallenge({
        tournamentId: tournament.id,
        order: i + 1,
        title: ch.title.slice(0, 200),
        prompt: ch.prompt.slice(0, 5000),
        mode: challengeMode,
        testCases: challengeMode === 'code' && ch.testCases ? ch.testCases.slice(0, 10).map((tc: any) => ({
          input: String(tc.input || '').slice(0, 1000),
          expectedOutput: String(tc.expectedOutput || '').slice(0, 1000),
        })) : [],
        requirements: ch.requirements || '',
        timeLimit: Math.min(Math.max(ch.timeLimit || (dur * 60 / challenges.length), 60), 7200),
        maxScore: 100,
      });
    }

    // Auto-join creator
    dbInsertTournamentPlayer(tournament.id, req.user!.id);

    // Insert SECRET evaluation criteria (not visible to participants)
    const criteria: any[] = [];
    if (evaluationCriteria && Array.isArray(evaluationCriteria)) {
      for (const ec of evaluationCriteria.slice(0, 10)) {
        if (!ec.name) continue;
        const criterion = dbInsertEvaluationCriterion({
          tournamentId: tournament.id,
          name: String(ec.name).slice(0, 100),
          description: String(ec.description || '').slice(0, 500),
          weight: Math.min(Math.max(Number(ec.weight) || 1, 1), 10),
          maxScore: 10,
        });
        criteria.push(criterion);
      }
    }

    const user = dbGetUser(req.user!.id);
    if (user) {
      dbInsertActivityEvent({
        type: 'join',
        userId: user.id,
        username: user.displayName || user.username,
        character: user.character,
        message: `${user.displayName || user.username} created a ${domainInfo.label} sandbox: ${name}`,
        metadata: { tournamentId: tournament.id, domain: domainKey },
      });
    }

    res.json({ ok: true, tournament, challenges: dbGetSandboxChallenges(tournament.id), criteriaCount: criteria.length });
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

    // Evaluation criteria: only visible to creator, and to all after tournament finishes
    const criteria = dbGetEvaluationCriteria(id);
    const requesterId = req.user?.id;
    const isCreator = requesterId === tournament.createdBy;
    const showCriteria = isCreator || tournament.status === 'finished';

    res.json({
      ok: true,
      tournament,
      domain: AGENT_DOMAINS[tournament.mode] || AGENT_DOMAINS.general,
      players,
      challenges,
      submissions: submissions.map(s => ({
        ...s,
        code: s.code.length > 5000 ? s.code.slice(0, 5000) + '\n// ... truncated ...' : s.code,
      })),
      votes,
      messages,
      playerScores,
      // SECRET: criteria hidden until finished or if you're the creator
      evaluationCriteria: showCriteria ? criteria : [],
      hasCriteria: criteria.length > 0,
      criteriaCount: criteria.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Join sandbox tournament ───────────────────────────────────

router.post('/tournaments/:id/join', authMiddleware, requireNonGuest, (req: Request, res: Response) => {
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

router.post('/tournaments/:id/start', authMiddleware, requireNonGuest, (req: Request, res: Response) => {
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

router.post('/tournaments/:id/submit', authMiddleware, requireNonGuest, (req: Request, res: Response) => {
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
      language: language || (challenge.mode === 'code' ? 'javascript' : challenge.mode === 'canvas' ? 'canvas-json' : challenge.mode === 'design' || challenge.mode === 'visual' ? 'html' : 'text'),
      testResults,
      autoScore,
      peerScore: 0,
      finalScore: autoScore,
      submittedAt: new Date().toISOString(),
      criteriaScores: {},
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

router.post('/tournaments/:id/vote', authMiddleware, requireNonGuest, (req: Request, res: Response) => {
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

router.post('/tournaments/:id/finish', authMiddleware, requireNonGuest, (req: Request, res: Response) => {
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
    const criteria = dbGetEvaluationCriteria(id);

    // Calculate final scores per player using criteria weights + peer votes + auto scores
    let bestPlayer = { userId: 0, score: 0, name: '' };
    for (const p of players) {
      const playerSubs = submissions.filter(s => s.userId === p.userId);
      let totalScore = 0;
      for (const s of playerSubs) {
        const subVotes = votes.filter(v => v.submissionId === s.id);
        const avgVote = subVotes.length > 0
          ? subVotes.reduce((a, b) => a + b.score, 0) / subVotes.length
          : 0;

        // Criteria-weighted score (if criteria exist and were scored)
        let criteriaScore = 0;
        if (criteria.length > 0 && s.criteriaScores && Object.keys(s.criteriaScores).length > 0) {
          let totalWeight = 0;
          let weightedSum = 0;
          for (const crit of criteria) {
            const critScore = s.criteriaScores[crit.id];
            if (critScore !== undefined) {
              weightedSum += critScore * crit.weight;
              totalWeight += crit.weight;
            }
          }
          if (totalWeight > 0) {
            criteriaScore = Math.round((weightedSum / totalWeight) * 10); // normalized to 0-100
          }
        }

        const subFinal = s.autoScore + Math.round(avgVote * 10) + criteriaScore;
        dbUpdateSandboxSubmission(s.id, { finalScore: subFinal });
        totalScore += subFinal;
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

router.post('/tournaments/:id/chat', authMiddleware, requireNonGuest, (req: Request, res: Response) => {
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

// ─── Judge: Score submission against secret criteria (creator only) ──

router.post('/tournaments/:id/judge', authMiddleware, requireNonGuest, (req: Request, res: Response) => {
  try {
    const tournamentId = parseInt(req.params.id as string);
    const { submissionId, criteriaScores } = req.body;
    // criteriaScores: Record<criterionId, score 0-10>

    if (!submissionId || !criteriaScores || typeof criteriaScores !== 'object') {
      res.status(400).json({ error: 'submissionId and criteriaScores object required' });
      return;
    }

    const tournament = dbGetTournament(tournamentId);
    if (!tournament) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }
    if (tournament.createdBy !== req.user!.id) {
      res.status(403).json({ error: 'Only the tournament creator can judge against criteria' });
      return;
    }

    const submission = dbGetSandboxSubmission(submissionId);
    if (!submission || submission.tournamentId !== tournamentId) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const criteria = dbGetEvaluationCriteria(tournamentId);
    if (criteria.length === 0) {
      res.status(400).json({ error: 'No evaluation criteria set for this tournament' });
      return;
    }

    // Validate and sanitize scores
    const sanitized: Record<number, number> = {};
    for (const crit of criteria) {
      const val = criteriaScores[crit.id] ?? criteriaScores[String(crit.id)];
      if (val !== undefined) {
        sanitized[crit.id] = Math.min(Math.max(Number(val), 0), crit.maxScore);
      }
    }

    dbUpdateSandboxSubmission(submissionId, { criteriaScores: sanitized });

    res.json({ ok: true, criteriaScores: sanitized });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ─── MARKETPLACE ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

router.get('/marketplace', (req: Request, res: Response) => {
  try {
    const domain = req.query.domain as string | undefined;
    const listingType = req.query.type as string | undefined;
    let listings = dbGetAllMarketplaceListings();
    if (domain && domain !== 'all') {
      listings = listings.filter(l => l.domain === domain);
    }
    if (listingType && listingType !== 'all') {
      listings = listings.filter(l => l.listingType === listingType);
    }
    res.json({ ok: true, listings, domains: AGENT_DOMAINS });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/marketplace/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const listing = dbGetMarketplaceListing(id);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    const reviews = dbGetMarketplaceReviews(id);
    res.json({ ok: true, listing, reviews });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/marketplace', authMiddleware, requireNonGuest, (req: Request, res: Response) => {
  try {
    const { title, description, domain, listingType, tags, content, previewHtml, price } = req.body;
    if (!title || !content) {
      res.status(400).json({ error: 'Title and content required' });
      return;
    }
    const validTypes = ['solution', 'tool', 'template', 'prompt', 'dataset'];
    if (listingType && !validTypes.includes(listingType)) {
      res.status(400).json({ error: `listingType must be one of: ${validTypes.join(', ')}` });
      return;
    }
    const user = dbGetUser(req.user!.id);
    if (!user) {
      res.status(403).json({ error: 'User not found' });
      return;
    }
    const listing = dbInsertMarketplaceListing({
      userId: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      character: user.character,
      title: String(title).slice(0, 200),
      description: String(description || '').slice(0, 2000),
      domain: (domain && Object.keys(AGENT_DOMAINS).includes(domain)) ? domain : 'general',
      listingType: (listingType || 'solution') as any,
      tags: Array.isArray(tags) ? tags.slice(0, 10).map((t: any) => String(t).slice(0, 30)) : [],
      content: String(content).slice(0, 100000),
      previewHtml: String(previewHtml || '').slice(0, 50000),
      price: Math.max(Number(price) || 0, 0),
      currency: (Number(price) || 0) > 0 ? 'karma' : 'free',
      downloads: 0,
      rating: 0,
      ratingCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    res.json({ ok: true, listing });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/marketplace/:id/download', authMiddleware, requireAuth, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const listing = dbGetMarketplaceListing(id);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    // Check karma for paid listings
    if (listing.price > 0 && listing.currency === 'karma') {
      const user = dbGetUser(req.user!.id);
      if (!user || user.karma < listing.price) {
        res.status(400).json({ error: `Not enough karma. Need ${listing.price}, have ${user?.karma || 0}` });
        return;
      }
      dbUpdateUser(req.user!.id, { karma: user.karma - listing.price });
      // Credit seller
      const seller = dbGetUser(listing.userId);
      if (seller) {
        dbUpdateUser(seller.id, { karma: seller.karma + listing.price });
      }
    }
    dbUpdateMarketplaceListing(id, { downloads: listing.downloads + 1 });
    res.json({ ok: true, content: listing.content });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/marketplace/:id/review', authMiddleware, requireNonGuest, (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be 1-5' });
      return;
    }
    const listing = dbGetMarketplaceListing(id);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    if (listing.userId === req.user!.id) {
      res.status(400).json({ error: 'Cannot review your own listing' });
      return;
    }
    const existing = dbFindMarketplaceReview(id, req.user!.id);
    if (existing) {
      res.status(400).json({ error: 'Already reviewed' });
      return;
    }
    const user = dbGetUser(req.user!.id);
    const review = dbInsertMarketplaceReview({
      listingId: id,
      userId: req.user!.id,
      username: user?.displayName || user?.username || 'Unknown',
      rating: Math.round(Number(rating)),
      comment: String(comment || '').slice(0, 500),
      createdAt: new Date().toISOString(),
    });
    // Recalculate avg rating
    const allReviews = dbGetMarketplaceReviews(id);
    const avgRating = allReviews.reduce((a, b) => a + b.rating, 0) / allReviews.length;
    dbUpdateMarketplaceListing(id, { rating: Math.round(avgRating * 10) / 10, ratingCount: allReviews.length });
    res.json({ ok: true, review });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
