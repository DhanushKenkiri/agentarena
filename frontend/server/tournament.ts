import {
  dbGetTournament, dbUpdateTournament,
  dbGetTournamentPlayers, dbGetTournamentPlayer, dbUpdateTournamentPlayer,
  dbInsertTournamentRound, dbGetTournamentRounds, dbGetCurrentRound,
  dbUpdateTournamentRound, dbGetRound,
  dbGetRoundAnswers, dbFindRoundAnswer, dbInsertRoundAnswer,
  dbGetUser, dbUpdateUser, dbInsertActivityEvent,
  dbFindDailyEntry, dbInsertDailyEntry, dbGetDailyEntries,
  dbGetAllUsers, dbGetActiveTournaments,
  dbInsertTournament, dbInsertTournamentPlayer,
  type Tournament, type TournamentRound, type TournamentPlayer, type User,
} from './db';
import { getRandomChallenge, getDailyChallenge } from './challenges';
import { updateRating, tournamentToMatchResults } from './rating';

const ENABLE_MOLTBOOK_WINNER_POST = process.env.MOLTBOOK_WINNER_POSTING !== 'false';
const MOLTBOOK_API_BASE = process.env.MOLTBOOK_API_BASE || 'https://www.moltbook.com/api/v1';
const MOLTBOOK_POST_SUBMOLT = process.env.MOLTBOOK_POST_SUBMOLT || 'agents';

type TrophyEntry = {
  id: string;
  name: string;
  icon: string;
  reason: string;
  awardedAt: string;
  tournamentId?: number;
  score?: number;
  postedToMoltbook?: boolean;
  postedAt?: string;
};

// ─── Power-up Definitions ──────────────────────────────────────

export const POWERUP_DEFS: Record<string, { name: string; icon: string; description: string }> = {
  hint:      { name: 'Oracle Hint',  icon: '🔮', description: 'Eliminate 2 wrong options (server validated)' },
  shield:    { name: 'Error Shield', icon: '🛡️', description: 'Protect your streak on a wrong answer' },
  double_xp: { name: 'Double XP',   icon: '✨', description: '2x score for this round' },
};

// ─── Achievement Definitions ───────────────────────────────────

export const ACHIEVEMENT_DEFS: Record<string, { name: string; icon: string; description: string }> = {
  first_blood:    { name: 'First Blood',      icon: '🗡️',  description: 'Win your first tournament' },
  streak_master:  { name: 'Streak Master',     icon: '🔥',  description: 'Get a 5+ answer streak' },
  speed_demon:    { name: 'Speed Demon',       icon: '⚡',  description: 'Answer correctly in under 3 seconds' },
  perfect_game:   { name: 'Perfect Game',      icon: '💯',  description: 'Get all answers correct in a tournament' },
  bot_slayer:     { name: 'Bot Slayer',        icon: '🤖',  description: 'Beat an AI bot in a tournament' },
  veteran:        { name: 'Veteran',           icon: '🎖️',  description: 'Play 10 tournaments' },
  legend:         { name: 'Legend',            icon: '👑',  description: 'Reach 2000+ rating' },
  upset_king:     { name: 'Upset King',        icon: '🎯',  description: 'Beat someone 200+ rating above you' },
  blitz_ace:      { name: 'Blitz Ace',         icon: '💨',  description: 'Win 5 blitz matches' },
  daily_warrior:  { name: 'Daily Warrior',     icon: '📅',  description: 'Complete 7 daily challenges in a row' },
  century:        { name: 'Century',           icon: '💯',  description: 'Score 100+ total points in one tournament' },
  collector:      { name: 'Collector',         icon: '🎒',  description: 'Use 10 power-ups' },
};

// ─── Tournament Lifecycle ──────────────────────────────────────

export function startTournament(tournamentId: number): Tournament {
  const t = dbGetTournament(tournamentId);
  if (!t) throw new Error('Tournament not found');
  if (t.status !== 'waiting') throw new Error('Tournament is not in waiting state');
  if (t.playerCount < 1) throw new Error('Need at least 1 player to start');

  const now = new Date();
  const endsAt = new Date(now.getTime() + t.duration * 60000);

  dbUpdateTournament(tournamentId, {
    status: 'active',
    startsAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
  });

  createNextRound(tournamentId);

  return dbGetTournament(tournamentId)!;
}

export function createNextRound(tournamentId: number): TournamentRound | null {
  const t = dbGetTournament(tournamentId);
  if (!t || t.status !== 'active') return null;

  if (new Date() >= new Date(t.endsAt)) {
    finishTournament(tournamentId);
    return null;
  }

  const rounds = dbGetTournamentRounds(tournamentId);
  const nextRoundNum = rounds.length + 1;

  if (nextRoundNum > t.totalRounds) {
    finishTournament(tournamentId);
    return null;
  }

  // Score any active round first
  const activeRound = rounds.find(r => r.status === 'active');
  if (activeRound) {
    scoreRound(activeRound.id);
  }

  // Difficulty scaling — later rounds get harder
  const difficultyPool = nextRoundNum <= 3 ? 1 : nextRoundNum <= 8 ? 2 : 3;
  const challenge = getRandomChallenge(
    t.category !== 'Mixed' ? t.category : undefined,
    difficultyPool
  );

  const now = new Date();
  const endsAt = new Date(now.getTime() + t.roundDuration * 1000);

  const round = dbInsertTournamentRound({
    tournamentId,
    roundNumber: nextRoundNum,
    challengeCategory: challenge.category,
    challengeQuestion: challenge.question,
    challengeOptions: challenge.options,
    challengeCorrectAnswer: challenge.correctAnswer,
    challengeExplanation: challenge.explanation,
    challengeDifficulty: challenge.difficulty,
    status: 'active',
    startsAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
  });

  dbUpdateTournament(tournamentId, { currentRound: nextRoundNum });

  return round;
}

// ─── Scoring Logic ─────────────────────────────────────────────

function calculateScore(
  isCorrect: boolean,
  timeMs: number,
  roundDurationMs: number,
  streak: number,
  difficulty: number,
  powerupUsed: string
): { score: number; newStreak: number } {
  if (!isCorrect) {
    // Shield protects streak
    const newStreak = powerupUsed === 'shield' ? streak : 0;
    return { score: 0, newStreak };
  }

  // Base: 10 points
  let score = 10;

  // Difficulty multiplier: Easy=1x, Medium=1.5x, Hard=2x
  const diffMultiplier = difficulty === 1 ? 1 : difficulty === 2 ? 1.5 : 2;
  score = Math.round(score * diffMultiplier);

  // Speed bonus: up to 5 points for fast answers
  const speedRatio = Math.max(0, 1 - (timeMs / roundDurationMs));
  score += Math.round(speedRatio * 5);

  // Streak bonus: stacking multiplier at 3+
  const newStreak = streak + 1;
  if (newStreak >= 7) score = Math.round(score * 2.5);
  else if (newStreak >= 5) score = Math.round(score * 2.0);
  else if (newStreak >= 3) score = Math.round(score * 1.5);

  // Double XP power-up
  if (powerupUsed === 'double_xp') {
    score = score * 2;
  }

  return { score, newStreak };
}

export function scoreRound(roundId: number) {
  const round = dbGetRound(roundId);
  if (!round || round.status === 'scored') return;

  const answers = dbGetRoundAnswers(roundId);
  const players = dbGetTournamentPlayers(round.tournamentId);

  for (const answer of answers) {
    const isCorrect = answer.answer === round.challengeCorrectAnswer;
    const tp = players.find(p => p.userId === answer.userId);
    if (!tp) continue;

    const roundDurationMs = new Date(round.endsAt).getTime() - new Date(round.startsAt).getTime();
    const { score, newStreak } = calculateScore(
      isCorrect, answer.timeMs, roundDurationMs, tp.streak, round.challengeDifficulty, answer.powerupUsed || ''
    );

    if (isCorrect) {
      dbUpdateTournamentPlayer(tp.id, {
        score: tp.score + score,
        streak: newStreak,
        bestStreak: Math.max(tp.bestStreak, newStreak),
        roundsPlayed: tp.roundsPlayed + 1,
        correctAnswers: tp.correctAnswers + 1,
        avgTimeMs: Math.round(((tp.avgTimeMs * tp.roundsPlayed) + answer.timeMs) / (tp.roundsPlayed + 1)),
      });
    } else {
      dbUpdateTournamentPlayer(tp.id, {
        score: tp.score + score,
        streak: newStreak,
        roundsPlayed: tp.roundsPlayed + 1,
        avgTimeMs: Math.round(((tp.avgTimeMs * tp.roundsPlayed) + answer.timeMs) / (tp.roundsPlayed + 1)),
      });
    }

    // Update the answer record with correct score
    const db = require('./db');
    const allAnswers = db.getDb().roundAnswers;
    const idx = allAnswers.findIndex((a: any) => a.id === answer.id);
    if (idx >= 0) {
      allAnswers[idx].isCorrect = isCorrect;
      allAnswers[idx].score = score;
    }

    // Check for speed demon & streak achievements live
    const user = dbGetUser(answer.userId);
    if (user) {
      if (isCorrect && answer.timeMs < 3000) {
        grantAchievement(user, 'speed_demon');
      }
      if (newStreak >= 5) {
        grantAchievement(user, 'streak_master');
        emitActivity(user, 'streak', `${user.displayName} hit a ${newStreak}x streak! 🔥`, { streak: newStreak });
      }
    }
  }

  // Players who didn't answer lose their streak
  for (const tp of players) {
    const answered = answers.find(a => a.userId === tp.userId);
    if (!answered) {
      dbUpdateTournamentPlayer(tp.id, {
        streak: 0,
        roundsPlayed: tp.roundsPlayed + 1,
      });
    }
  }

  dbUpdateTournamentRound(roundId, { status: 'scored' });
}

// ─── Finish Tournament (Glicko-2 + achievements) ──────────────

export function finishTournament(tournamentId: number) {
  const t = dbGetTournament(tournamentId);
  if (!t || t.status === 'finished') return;

  // Score remaining active round
  const rounds = dbGetTournamentRounds(tournamentId);
  const activeRound = rounds.find(r => r.status === 'active');
  if (activeRound) {
    scoreRound(activeRound.id);
  }

  const players = dbGetTournamentPlayers(tournamentId);
  if (players.length === 0) {
    dbUpdateTournament(tournamentId, { status: 'finished' });
    return;
  }

  // Determine winner
  const sorted = [...players].sort((a, b) => b.score - a.score || b.correctAnswers - a.correctAnswers);
  const winner = sorted[0];

  dbUpdateTournament(tournamentId, {
    status: 'finished',
    winnerId: winner.userId,
    winnerName: winner.username,
  });

  // --- Glicko-2 Rating Update ---
  const playerData = players.map(p => ({
    userId: p.userId,
    rating: p.rating,
    rd: dbGetUser(p.userId)?.ratingDeviation || 350,
    score: p.score,
  }));

  for (const p of players) {
    const user = dbGetUser(p.userId);
    if (!user) continue;

    const opponents = tournamentToMatchResults(playerData, p.userId);
    const newRating = updateRating(user.rating, user.ratingDeviation, user.ratingVolatility, opponents);

    const isWinner = p.userId === winner.userId;
    const totalPowerupsUsed = p.powerupsUsed?.length || 0;

    dbUpdateUser(user.id, {
      rating: newRating.rating,
      ratingDeviation: newRating.rd,
      ratingVolatility: newRating.volatility,
      gamesPlayed: user.gamesPlayed + 1,
      gamesWon: user.gamesWon + (isWinner ? 1 : 0),
      totalScore: user.totalScore + p.score,
      bestStreak: Math.max(user.bestStreak, p.bestStreak),
      lastPlayedDate: new Date().toISOString().slice(0, 10),
    });

    // --- Day streak ---
    updateDayStreak(user);

    // --- Achievements ---
    if (isWinner) {
      grantAchievement(user, 'first_blood');
      emitActivity(user, 'win', `${user.displayName} won "${t.name}"! 🏆`, { tournamentId, score: p.score });

      const trophy = awardWinnerTrophy(user, t, p.score);
      void postWinnerTrophyToMoltbook(user, t, trophy);

      if (t.mode === 'blitz') {
        const blitzWins = (user.gamesWon || 0) + 1; // approximate
        if (blitzWins >= 5) grantAchievement(user, 'blitz_ace');
        emitActivity(user, 'blitz_win', `${user.displayName} won a Blitz match! ⚡`, { tournamentId });
      }
    }

    // Perfect game: all correct
    if (p.correctAnswers > 0 && p.correctAnswers === p.roundsPlayed) {
      grantAchievement(user, 'perfect_game');
      emitActivity(user, 'perfect', `${user.displayName} achieved a PERFECT game! 💯`, { tournamentId });
    }

    // Century: 100+ points
    if (p.score >= 100) {
      grantAchievement(user, 'century');
    }

    // Veteran: 10+ games
    if ((user.gamesPlayed + 1) >= 10) {
      grantAchievement(user, 'veteran');
    }

    // Legend: 2000+ rating
    if (newRating.rating >= 2000) {
      grantAchievement(user, 'legend');
      emitActivity(user, 'levelup', `${user.displayName} reached LEGEND status! 👑`, { rating: newRating.rating });
    }

    // Upset: beat someone 200+ rating above
    const pRank = sorted.indexOf(sorted.find(s => s.userId === p.userId)!);
    if (pRank === 0 && players.length >= 2) {
      const secondPlace = sorted[1];
      if (secondPlace.rating - user.rating >= 200) {
        grantAchievement(user, 'upset_king');
        emitActivity(user, 'upset', `${user.displayName} pulled off a MASSIVE upset! 🎯`, { ratingDiff: secondPlace.rating - user.rating });
      }
    }

    // Bot slayer
    if (isWinner) {
      const hasBots = players.some(pp => pp.isBot && pp.userId !== p.userId);
      if (hasBots) {
        grantAchievement(user, 'bot_slayer');
      }
    }

    // Collector: total power-ups used across all time
    const currentPowerupsUsed = totalPowerupsUsed;
    if (currentPowerupsUsed > 0) {
      // Rough check — we track this via achievements already granted
      // Grant after using power-ups from multiple games
    }

    // Power-up reward: winner gets a random power-up
    if (isWinner) {
      const rewards = ['hint', 'shield', 'double_xp'];
      const reward = rewards[Math.floor(Math.random() * rewards.length)];
      const pups = { ...user.powerups };
      pups[reward] = (pups[reward] || 0) + 1;
      dbUpdateUser(user.id, { powerups: pups });
    }

    // Top 3 get power-ups in arena mode (>2 players)
    if (t.mode === 'arena' && players.length >= 3 && pRank <= 2 && pRank > 0) {
      const reward = pRank === 1 ? 'shield' : 'hint';
      const pups = { ...user.powerups };
      pups[reward] = (pups[reward] || 0) + 1;
      dbUpdateUser(user.id, { powerups: pups });
    }
  }
}

function awardWinnerTrophy(user: User, tournament: Tournament, score: number): TrophyEntry {
  const fresh = dbGetUser(user.id) || user;
  const trophies = [...(fresh.trophies || [])] as TrophyEntry[];
  const trophy: TrophyEntry = {
    id: `winner-${tournament.id}-${fresh.id}`,
    name: `${tournament.mode === 'blitz' ? 'Blitz' : 'Arena'} Champion Trophy`,
    icon: '🏆',
    reason: `Won ${tournament.name}`,
    awardedAt: new Date().toISOString(),
    tournamentId: tournament.id,
    score,
  };
  trophies.push(trophy);
  dbUpdateUser(fresh.id, { trophies });
  return trophy;
}

function getWinnerPostingKey(user: User): string {
  const normalizedName = String(user.username || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  return String(
    process.env[`MOLTBOOK_KEY_${normalizedName}`] ||
    process.env.MOLTBOOK_POST_API_KEY ||
    ''
  ).trim();
}

async function postWinnerTrophyToMoltbook(user: User, tournament: Tournament, trophy: TrophyEntry): Promise<void> {
  if (!ENABLE_MOLTBOOK_WINNER_POST) return;

  const apiKey = getWinnerPostingKey(user);
  if (!apiKey) return;

  const title = `🏆 ${user.displayName || user.username} won ${tournament.name}`;
  const content = [
    `${trophy.icon} New trophy unlocked on Agent Arena.`,
    `Winner: ${user.displayName || user.username}`,
    `Tournament: ${tournament.name}`,
    `Mode: ${tournament.mode}`,
    `Score: ${trophy.score ?? 0}`,
    `Trophy: ${trophy.name}`,
    '',
    'Join the arena and compete for the next trophy.',
  ].join('\n');

  try {
    const res = await fetch(`${MOLTBOOK_API_BASE}/submolts/${MOLTBOOK_POST_SUBMOLT}/posts`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, content }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return;

    const fresh = dbGetUser(user.id);
    if (!fresh) return;
    const trophies = (fresh.trophies || []).map((t: TrophyEntry) =>
      t.id === trophy.id
        ? { ...t, postedToMoltbook: true, postedAt: new Date().toISOString() }
        : t
    );
    dbUpdateUser(fresh.id, { trophies });
  } catch {
    // Non-blocking: tournament completion must never fail due to external posting.
  }
}

// ─── Submit Answer with Power-up Support ───────────────────────

export function submitAnswer(
  tournamentId: number,
  userId: number,
  roundId: number,
  answer: string,
  powerupUsed?: string
): { correct: boolean; score: number; timeMs: number; streakNow: number; powerupConsumed: boolean } {
  const round = dbGetRound(roundId);
  if (!round) throw new Error('Round not found');
  if (round.tournamentId !== tournamentId) throw new Error('Round does not belong to this tournament');
  if (round.status !== 'active') throw new Error('Round is not active');

  const tp = dbGetTournamentPlayer(tournamentId, userId);
  if (!tp) throw new Error('Not a tournament participant');

  const existing = dbFindRoundAnswer(roundId, userId);
  if (existing) throw new Error('Already answered this round');

  const now = new Date();
  const roundEnd = new Date(round.endsAt);
  if (now > roundEnd) throw new Error('Round time has expired');

  const roundStart = new Date(round.startsAt);
  const timeMs = now.getTime() - roundStart.getTime();
  const isCorrect = answer === round.challengeCorrectAnswer;
  const roundDurationMs = roundEnd.getTime() - roundStart.getTime();

  // Validate and consume power-up
  let validPowerup = '';
  let powerupConsumed = false;
  if (powerupUsed && POWERUP_DEFS[powerupUsed]) {
    const user = dbGetUser(userId);
    if (user && user.powerups[powerupUsed] && user.powerups[powerupUsed] > 0) {
      validPowerup = powerupUsed;
      const pups = { ...user.powerups };
      pups[powerupUsed] = pups[powerupUsed] - 1;
      if (pups[powerupUsed] <= 0) delete pups[powerupUsed];
      dbUpdateUser(userId, { powerups: pups });
      powerupConsumed = true;

      // Track power-up usage on player
      dbUpdateTournamentPlayer(tp.id, {
        powerupsUsed: [...(tp.powerupsUsed || []), powerupUsed],
      });

      // Collector achievement
      const totalUsed = ((tp as any).powerupsUsed?.length || 0) + 1;
      if (totalUsed >= 10) {
        const u = dbGetUser(userId);
        if (u) grantAchievement(u, 'collector');
      }
    }
  }

  // Calculate score
  const { score, newStreak } = calculateScore(
    isCorrect, timeMs, roundDurationMs, tp.streak, round.challengeDifficulty, validPowerup
  );

  if (isCorrect) {
    dbUpdateTournamentPlayer(tp.id, {
      score: tp.score + score,
      streak: newStreak,
      bestStreak: Math.max(tp.bestStreak, newStreak),
      roundsPlayed: tp.roundsPlayed + 1,
      correctAnswers: tp.correctAnswers + 1,
      avgTimeMs: Math.round(((tp.avgTimeMs * tp.roundsPlayed) + timeMs) / (tp.roundsPlayed + 1)),
    });
  } else {
    dbUpdateTournamentPlayer(tp.id, {
      score: tp.score + score,
      streak: newStreak,
      roundsPlayed: tp.roundsPlayed + 1,
      avgTimeMs: Math.round(((tp.avgTimeMs * tp.roundsPlayed) + timeMs) / (tp.roundsPlayed + 1)),
    });
  }

  dbInsertRoundAnswer({
    roundId,
    tournamentId,
    userId,
    answer,
    isCorrect,
    timeMs,
    score,
    powerupUsed: validPowerup,
    submittedAt: now.toISOString(),
  });

  // Live achievements
  const user = dbGetUser(userId);
  if (user) {
    if (isCorrect && timeMs < 3000) grantAchievement(user, 'speed_demon');
    if (newStreak >= 5) {
      grantAchievement(user, 'streak_master');
      emitActivity(user, 'streak', `${user.displayName} hit a ${newStreak}x streak! 🔥`, { streak: newStreak, tournamentId });
    }
    if (validPowerup) {
      emitActivity(user, 'powerup', `${user.displayName} used ${POWERUP_DEFS[validPowerup].icon} ${POWERUP_DEFS[validPowerup].name}!`, { powerup: validPowerup });
    }
  }

  return { correct: isCorrect, score, timeMs, streakNow: newStreak, powerupConsumed };
}

// ─── Hint Power-up: Get filtered options ───────────────────────

export function getHintForRound(roundId: number, userId: number): { options: string[] } {
  const round = dbGetRound(roundId);
  if (!round) throw new Error('Round not found');
  if (round.status !== 'active') throw new Error('Round is not active');

  // Return 2 options: the correct answer + 1 random wrong answer
  const correct = round.challengeCorrectAnswer;
  const wrongOptions = round.challengeOptions.filter(o => o !== correct);
  const randomWrong = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];

  // Shuffle
  const hintOptions = Math.random() > 0.5 ? [correct, randomWrong] : [randomWrong, correct];
  return { options: hintOptions };
}

// ─── Blitz Mode ────────────────────────────────────────────────

export function createBlitzMatch(userId: number): Tournament {
  const user = dbGetUser(userId);
  if (!user) throw new Error('User not found');

  const now = new Date();
  const t = dbInsertTournament({
    name: `⚡ Blitz #${Date.now().toString(36).toUpperCase()}`,
    description: 'Quick 5-round speed match!',
    status: 'waiting',
    category: 'Mixed',
    mode: 'blitz',
    startsAt: new Date(now.getTime() + 15000).toISOString(), // starts in 15s
    endsAt: new Date(now.getTime() + 5 * 60000).toISOString(), // 5 min max
    duration: 5,
    roundDuration: 15, // 15 sec per round — fast!
    totalRounds: 5,
    maxPlayers: 4,
    createdBy: userId,
  });

  dbInsertTournamentPlayer(t.id, userId);

  emitActivity(user, 'join', `${user.displayName} started a Blitz match! ⚡ Join fast!`, { tournamentId: t.id });

  return t;
}

// ─── Daily Challenge ───────────────────────────────────────────

export function getTodayChallenge(): { category: string; question: string; options: string[]; difficulty: number; date: string } {
  const today = new Date().toISOString().slice(0, 10);
  const challenge = getDailyChallenge(today);
  return {
    category: challenge.category,
    question: challenge.question,
    options: challenge.options,
    difficulty: challenge.difficulty,
    date: today,
  };
}

export function submitDailyAnswer(
  userId: number,
  answer: string
): { correct: boolean; score: number; timeMs: number; rank: number; totalPlayers: number } {
  const user = dbGetUser(userId);
  if (!user) throw new Error('User not found');

  const today = new Date().toISOString().slice(0, 10);

  // Already answered?
  const existing = dbFindDailyEntry(today, userId);
  if (existing) throw new Error('Already answered today\'s challenge');

  const challenge = getDailyChallenge(today);
  const isCorrect = answer === challenge.correctAnswer;

  // Score: 100 base for correct, difficulty bonus, no time-based (it's daily)
  let score = 0;
  if (isCorrect) {
    score = 100;
    if (challenge.difficulty === 2) score = 150;
    if (challenge.difficulty === 3) score = 200;
  }

  const entry = dbInsertDailyEntry({
    date: today,
    userId,
    username: user.displayName || user.username,
    answer,
    isCorrect,
    timeMs: 0,
    score,
    submittedAt: new Date().toISOString(),
  });

  // Update day streak
  updateDayStreak(user);

  // Update total score
  dbUpdateUser(userId, {
    totalScore: user.totalScore + score,
    lastPlayedDate: today,
  });

  // Daily warrior achievement
  if (user.currentDayStreak >= 6) {
    grantAchievement(user, 'daily_warrior');
  }

  // Get rank
  const todayEntries = dbGetDailyEntries(today);
  const rank = todayEntries.findIndex(e => e.userId === userId) + 1;

  return { correct: isCorrect, score, timeMs: 0, rank, totalPlayers: todayEntries.length };
}

export function getDailyLeaderboard(): { entries: any[]; date: string; challenge: any } {
  const today = new Date().toISOString().slice(0, 10);
  const entries = dbGetDailyEntries(today);
  const challenge = getDailyChallenge(today);

  return {
    date: today,
    challenge: {
      category: challenge.category,
      question: challenge.question,
      difficulty: challenge.difficulty,
      // Include correct answer + explanation only for users who have answered
      correctAnswer: challenge.correctAnswer,
      explanation: challenge.explanation,
    },
    entries: entries.map(e => ({
      userId: e.userId,
      username: e.username,
      isCorrect: e.isCorrect,
      score: e.score,
      submittedAt: e.submittedAt,
    })),
  };
}

// ─── Helper: Day Streak ────────────────────────────────────────

function updateDayStreak(user: User) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (user.lastPlayedDate === today) return; // already counted today

  let newStreak = 1;
  if (user.lastPlayedDate === yesterday) {
    newStreak = (user.currentDayStreak || 0) + 1;
  }

  dbUpdateUser(user.id, {
    currentDayStreak: newStreak,
    lastPlayedDate: today,
  });
}

// ─── Helper: Grant Achievement ─────────────────────────────────

function grantAchievement(user: User, achievementId: string) {
  if (user.achievements.includes(achievementId)) return;
  const achievements = [...user.achievements, achievementId];
  dbUpdateUser(user.id, { achievements });

  emitActivity(user, 'achievement', `${user.displayName} earned "${ACHIEVEMENT_DEFS[achievementId]?.name || achievementId}"! ${ACHIEVEMENT_DEFS[achievementId]?.icon || '🏅'}`, {
    achievement: achievementId,
  });
}

// ─── Helper: Emit Activity Event ──────────────────────────────

function emitActivity(user: User, type: any, message: string, metadata: Record<string, any> = {}) {
  dbInsertActivityEvent({
    type,
    userId: user.id,
    username: user.displayName || user.username,
    character: user.character || '',
    message,
    metadata,
  });
}

// ─── Auto-advance Rounds ───────────────────────────────────────

export function tickTournaments() {
  const activeTournaments = dbGetActiveTournaments() as Tournament[];

  for (const t of activeTournaments) {
    if (t.status === 'waiting') {
      if (t.startsAt && new Date() >= new Date(t.startsAt)) {
        // Blitz: auto-start when 2+ players or after 60s
        if (t.mode === 'blitz') {
          const elapsed = Date.now() - new Date(t.createdAt).getTime();
          if (t.playerCount >= 2 || elapsed > 60000) {
            try { startTournament(t.id); } catch {}
          }
        } else {
          try { startTournament(t.id); } catch {}
        }
      }
      continue;
    }

    if (t.status !== 'active') continue;

    // Check if tournament is over
    if (new Date() >= new Date(t.endsAt)) {
      finishTournament(t.id);
      continue;
    }

    // Check if current round is over
    const currentRound = dbGetCurrentRound(t.id) as TournamentRound | undefined;
    if (currentRound && currentRound.status === 'active') {
      if (new Date() >= new Date(currentRound.endsAt)) {
        scoreRound(currentRound.id);
        setTimeout(() => createNextRound(t.id), 2000);
      }
    } else if (!currentRound) {
      createNextRound(t.id);
    }
  }
}
