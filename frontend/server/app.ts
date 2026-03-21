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
import artRouter from './routes/art';
import { authMiddleware } from './auth';
import { getDb, loadDbFromBlob, reloadFromBlob, dbGetAllUsers, dbGetAllTournaments, dbGetActiveTournaments, dbGetTotalChallengesCompleted, dbGetAllArtworks } from './db';
import { tickTournaments, POWERUP_DEFS, ACHIEVEMENT_DEFS } from './tournament';
import { getTotalChallengesCount, getAllCategories } from './challenges';
import { tickAutopilot, startSelfPing } from './autopilot';

const app = express();
// Demo data enabled by default to show real stats
const ENABLE_DEMO_DATA = process.env.ENABLE_DEMO_DATA !== 'false';
// Autopilot enabled by default for organic growth and continuous tournaments
const ENABLE_AUTOPILOT = process.env.ENABLE_AUTOPILOT !== 'false';

// Middleware — permissive CORS for agent API calls (curl, Postman, bots)
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(authMiddleware);

// Prevent stale cached API responses so dashboard/user counts stay fresh.
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Ensure blob data is loaded before handling any requests (serverless cold start)
import { seedAgents } from './seed';
import { saveBlobNow } from './db';
let _blobSeeded = false;
app.use(async (_req, _res, next) => {
  // First request: full cold-start load from blob
  if (!_blobSeeded) {
    _blobSeeded = true;
    const blobStatus = await loadDbFromBlob();
    if (ENABLE_DEMO_DATA && getDb().users.length === 0) {
      seedAgents();
      await saveBlobNow();
    }
  }
  next();
});

// saveBlobNow is imported above and used directly in route handlers for critical mutations

// Tournament tick + auto-pilot middleware — runs on each request (serverless-friendly)
app.use((_req, _res, next) => {
  try { tickTournaments(); } catch {}
  if (ENABLE_AUTOPILOT) {
    try { tickAutopilot(); } catch {}
  }
  next();
});

// Health check
app.get('/api/health', async (_req, res) => {
  await reloadFromBlob();

  // Self-heal empty persisted state so landing stats are never stuck at zero.
  if (ENABLE_DEMO_DATA && dbGetAllUsers().length === 0) {
    seedAgents();
    await saveBlobNow();
  }

  // Only self-ping when autopilot is explicitly enabled.
  if (ENABLE_AUTOPILOT) {
    const proto = _req.get('x-forwarded-proto') || _req.protocol;
    const baseUrl = `${proto}://${_req.get('host')}`;
    startSelfPing(baseUrl);
  }

  const users = dbGetAllUsers();
  const registeredAgents = users.filter(u => u.botEngine !== 'guest').length;
  const tournaments = dbGetAllTournaments();
  const active = dbGetActiveTournaments();
  const artworks = dbGetAllArtworks();
  const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    stats: {
      totalUsers: users.length,
      totalRegisteredAgents: registeredAgents,
      onlineUsers: users.filter(u => u.lastSeen >= fiveMinAgo).length,
      totalBots: users.filter(u => u.isBot).length,
      totalTournaments: tournaments.length,
      activeTournaments: active.length,
      challengePool: getTotalChallengesCount(),
      challengesCompleted: dbGetTotalChallengesCompleted(),
      categories: getAllCategories(),
      artworks: artworks.length,
    },
  });
});

// Real-time health stats stream for dashboard live updates
app.get('/api/health/stream', (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  const buildStats = () => {
    const users = dbGetAllUsers();
    const registeredAgents = users.filter(u => u.botEngine !== 'guest').length;
    const active = dbGetActiveTournaments();
    const artworks = dbGetAllArtworks();
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    return {
      totalUsers: users.length,
      totalRegisteredAgents: registeredAgents,
      onlineUsers: users.filter(u => u.lastSeen >= fiveMinAgo).length,
      activeTournaments: active.length,
      totalBots: users.filter(u => u.isBot).length,
      challengePool: getTotalChallengesCount(),
      challengesCompleted: dbGetTotalChallengesCompleted(),
      artworks: artworks.length,
      timestamp: new Date().toISOString(),
    };
  };

  const emitStats = (payload: ReturnType<typeof buildStats>) => {

    res.write(`event: stats\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  let lastSent = '';

  reloadFromBlob().catch(() => {}).finally(() => {
    const initial = buildStats();
    emitStats(initial);
    lastSent = JSON.stringify(initial);
  });

  let tick = 0;
  const statsTimer = setInterval(async () => {
    tick += 1;
    if (tick % 2 === 0) {
      await reloadFromBlob();
    }

    const payload = buildStats();
    const next = JSON.stringify(payload);
    if (next === lastSent) return;
    emitStats(payload);
    lastSent = next;
  }, 1000);

  const keepAliveTimer = setInterval(() => {
    res.write(`: ping ${Date.now()}\n\n`);
  }, 15000);

  _req.on('close', () => {
    clearInterval(statsTimer);
    clearInterval(keepAliveTimer);
    res.end();
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
    features: {
      demoData: ENABLE_DEMO_DATA,
      autopilot: ENABLE_AUTOPILOT,
      guestLogin: process.env.ALLOW_GUEST_LOGIN === 'true',
    },
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
app.use('/api/art', artRouter);

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
  if (ENABLE_DEMO_DATA) {
    seedAgents();
  }
}

export default app;
