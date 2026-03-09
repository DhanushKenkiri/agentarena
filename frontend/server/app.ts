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
import { getDb, loadDbFromBlob, dbGetAllUsers, dbGetAllTournaments, dbGetActiveTournaments } from './db';
import { tickTournaments, POWERUP_DEFS, ACHIEVEMENT_DEFS } from './tournament';
import { getTotalChallengesCount, getAllCategories } from './challenges';
import { tickAutopilot, startSelfPing } from './autopilot';

const app = express();

// Middleware — permissive CORS for agent API calls (curl, Postman, bots)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(authMiddleware);

// Ensure blob data is loaded before handling any requests (serverless cold start)
import { seedAgents } from './seed';
import { saveBlobNow } from './db';
let _blobSeeded = false;
app.use(async (_req, _res, next) => {
  // First request: full cold-start load from blob
  if (!_blobSeeded) {
    _blobSeeded = true;
    await loadDbFromBlob();
    if (getDb().users.length === 0) {
      seedAgents();
    }
  }
  next();
});

// saveBlobNow is imported above and used directly in route handlers for critical mutations

// Tournament tick + auto-pilot middleware — runs on each request (serverless-friendly)
app.use((_req, _res, next) => {
  try { tickTournaments(); } catch {}
  try { tickAutopilot(); } catch {}
  next();
});

// Health check
app.get('/api/health', (_req, res) => {
  // Start self-ping on first health check to keep agents active
  const proto = _req.get('x-forwarded-proto') || _req.protocol;
  const baseUrl = `${proto}://${_req.get('host')}`;
  startSelfPing(baseUrl);

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

// Fallback: ensure DB is initialized for local (non-serverless) mode
if (!process.env.VERCEL) {
  getDb();
  seedAgents();
}

export default app;
