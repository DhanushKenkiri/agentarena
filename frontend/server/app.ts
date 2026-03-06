import express from 'express';
import cors from 'cors';

import authRouter from './routes/auth';
import tournamentsRouter from './routes/tournaments';
import usersRouter from './routes/users';
import adminRouter from './routes/admin';
import dailyRouter from './routes/daily';
import activityRouter from './routes/activity';
import agentsRouter from './routes/agents';
import sandboxRouter from './routes/sandbox';
import { authMiddleware } from './auth';
import { getDb, dbGetAllUsers, dbGetAllTournaments, dbGetActiveTournaments } from './db';
import { tickTournaments, POWERUP_DEFS, ACHIEVEMENT_DEFS } from './tournament';
import { getTotalChallengesCount, getAllCategories } from './challenges';

const app = express();

// Middleware — permissive CORS for agent API calls (curl, Postman, bots)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(authMiddleware);

// Tournament tick middleware — runs on each request (for serverless where setInterval doesn't work)
app.use((_req, _res, next) => {
  try { tickTournaments(); } catch {}
  next();
});

// Health check
app.get('/api/health', (_req, res) => {
  const users = dbGetAllUsers();
  const tournaments = dbGetAllTournaments();
  const active = dbGetActiveTournaments();
  const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    stats: {
      totalUsers: users.length,
      onlineUsers: users.filter(u => u.lastSeen >= fiveMinAgo).length,
      totalBots: users.filter(u => u.isBot).length,
      totalTournaments: tournaments.length,
      activeTournaments: active.length,
      challengePool: getTotalChallengesCount(),
      categories: getAllCategories(),
    },
  });
});

// Game meta
app.get('/api/meta', (_req, res) => {
  res.json({
    ok: true,
    powerups: POWERUP_DEFS,
    achievements: ACHIEVEMENT_DEFS,
    categories: getAllCategories(),
    challengeCount: getTotalChallengesCount(),
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/v1/agents', agentsRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/daily', dailyRouter);
app.use('/api/activity', activityRouter);
app.use('/api/sandbox', sandboxRouter);

// skill.json — dynamic metadata endpoint
app.get('/api/skill.json', (_req, res) => {
  const proto = _req.get('x-forwarded-proto') || _req.protocol;
  const baseUrl = `${proto}://${_req.get('host')}`;
  res.json({
    name: 'agentarena',
    version: '1.0.0',
    description: 'IoT Battle Royale — the competitive knowledge arena for AI agents. Register, compete in tournaments, earn achievements, climb the ranks.',
    homepage: baseUrl,
    metadata: {
      emoji: '👾',
      category: 'gaming',
      api_base: `${baseUrl}/api/v1`,
    },
  });
});

// Initialize DB + seed starter agents
import { seedAgents } from './seed';
getDb();
seedAgents();

export default app;
