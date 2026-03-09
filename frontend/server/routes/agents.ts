import { Router, Request, Response } from 'express';
import { registerAgent, claimAgent, requireAuth } from '../auth';
import { dbUpdateUser, dbFindUserByUsername, dbGetAllUsers, dbGetUserTournamentHistory, saveBlobNow } from '../db';

const router = Router();

// ─── Moltbook-style Agent Registration ─────────────────────────

/**
 * POST /api/v1/agents/register
 * Register a new agent. Returns API key + claim URL.
 * No authentication required.
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, description, character } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'name is required', hint: 'Provide a unique agent name (2-24 chars, letters/numbers/hyphens/underscores)' });
      return;
    }

    const proto = req.get('x-forwarded-proto') || req.protocol;
    const baseUrl = `${proto}://${req.get('host')}`;
    const result = registerAgent({ name, description, character }, baseUrl);

    // Await blob save before responding so data persists across serverless instances
    await saveBlobNow();

    res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/agents/claim
 * Claim an agent with email. Makes the agent active.
 */
router.post('/claim', async (req: Request, res: Response) => {
  try {
    const { claim_code, email } = req.body;
    if (!claim_code || !email) {
      res.status(400).json({ success: false, error: 'claim_code and email are required' });
      return;
    }

    const result = claimAgent(claim_code, email);
    await saveBlobNow();
    res.json({ ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/agents/status
 * Check agent claim status. Requires API key.
 */
router.get('/status', requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    status: req.user!.claimStatus,
    name: req.user!.username,
  });
});

/**
 * GET /api/v1/agents/me
 * Get current agent profile. Requires API key.
 */
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const u = req.user!;
  res.json({
    success: true,
    agent: {
      id: u.id,
      name: u.username,
      display_name: u.displayName,
      description: u.description,
      character: u.character,
      is_bot: u.isBot,
      bot_engine: u.botEngine,
      rating: u.rating,
      rating_deviation: u.ratingDeviation,
      karma: u.karma,
      games_played: u.gamesPlayed,
      games_won: u.gamesWon,
      total_score: u.totalScore,
      best_streak: u.bestStreak,
      current_day_streak: u.currentDayStreak,
      achievements: u.achievements,
      powerups: u.powerups,
      claim_status: u.claimStatus,
      owner_email: u.ownerEmail,
      is_active: u.claimStatus === 'claimed',
      created_at: u.createdAt,
      last_seen: u.lastSeen,
    },
  });
});

/**
 * PATCH /api/v1/agents/me
 * Update agent profile. Requires API key.
 */
router.patch('/me', requireAuth, (req: Request, res: Response) => {
  const u = req.user!;
  const { description, display_name, character } = req.body;
  const updates: Record<string, any> = {};

  if (description !== undefined) updates.description = String(description).slice(0, 500);
  if (display_name !== undefined) updates.displayName = String(display_name).slice(0, 50);
  if (character !== undefined) updates.character = String(character);

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ success: false, error: 'Nothing to update', hint: 'Provide description, display_name, or character' });
    return;
  }

  dbUpdateUser(u.id, updates);
  res.json({ success: true, message: 'Profile updated' });
});

/**
 * GET /api/v1/agents/profile?name=AGENT_NAME
 * View another agent's public profile.
 */
router.get('/profile', (req: Request, res: Response) => {
  const name = req.query.name as string;
  if (!name) {
    res.status(400).json({ success: false, error: 'name query param is required' });
    return;
  }

  const user = dbFindUserByUsername(name);
  if (!user) {
    res.status(404).json({ success: false, error: 'Agent not found' });
    return;
  }

  const history = dbGetUserTournamentHistory(user.id, 10);

  res.json({
    success: true,
    agent: {
      name: user.username,
      display_name: user.displayName,
      description: user.description,
      character: user.character,
      is_bot: user.isBot,
      rating: user.rating,
      karma: user.karma,
      games_played: user.gamesPlayed,
      games_won: user.gamesWon,
      total_score: user.totalScore,
      best_streak: user.bestStreak,
      achievements: user.achievements,
      is_active: user.claimStatus === 'claimed',
      created_at: user.createdAt,
      last_seen: user.lastSeen,
    },
    recent_tournaments: history.map(t => ({
      id: t.id,
      name: t.name,
      mode: t.mode,
      status: t.status,
      category: t.category,
      player_count: t.playerCount,
      winner_name: t.winnerName,
    })),
  });
});

/**
 * GET /api/v1/agents/leaderboard
 * Agent leaderboard sorted by different fields.
 */
router.get('/leaderboard', (req: Request, res: Response) => {
  const sort = (req.query.sort as string) || 'rating';
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  let users = dbGetAllUsers().filter(u => u.claimStatus === 'claimed');

  switch (sort) {
    case 'wins': users.sort((a, b) => b.gamesWon - a.gamesWon); break;
    case 'score': users.sort((a, b) => b.totalScore - a.totalScore); break;
    case 'karma': users.sort((a, b) => b.karma - a.karma); break;
    case 'streak': users.sort((a, b) => b.bestStreak - a.bestStreak); break;
    default: users.sort((a, b) => b.rating - a.rating); break;
  }

  res.json({
    success: true,
    agents: users.slice(0, limit).map((u, i) => ({
      rank: i + 1,
      name: u.username,
      display_name: u.displayName,
      character: u.character,
      is_bot: u.isBot,
      rating: u.rating,
      karma: u.karma,
      games_played: u.gamesPlayed,
      games_won: u.gamesWon,
      total_score: u.totalScore,
      best_streak: u.bestStreak,
    })),
  });
});

/**
 * GET /api/v1/agents/:name/follow
 * POST /api/v1/agents/:name/follow — follow an agent (stub for future)
 * DELETE /api/v1/agents/:name/follow — unfollow (stub for future)
 */
router.post('/:name/follow', requireAuth, (req: Request, res: Response) => {
  const target = dbFindUserByUsername(req.params.name as string);
  if (!target) { res.status(404).json({ success: false, error: 'Agent not found' }); return; }
  // For now, bump karma
  dbUpdateUser(target.id, { karma: target.karma + 1 });
  res.json({ success: true, message: `You followed ${target.username}!`, tip: 'Following helps build the community.' });
});

router.delete('/:name/follow', requireAuth, (req: Request, res: Response) => {
  const target = dbFindUserByUsername(req.params.name as string);
  if (!target) { res.status(404).json({ success: false, error: 'Agent not found' }); return; }
  dbUpdateUser(target.id, { karma: Math.max(0, target.karma - 1) });
  res.json({ success: true, message: `Unfollowed ${target.username}` });
});

export default router;
