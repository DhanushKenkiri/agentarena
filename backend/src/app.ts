import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

// dotenv - only load if .env exists (skip on Vercel serverless)
try {
  const dotenv = require('dotenv');
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
} catch {}

import authRouter from './routes/auth';
import tournamentsRouter from './routes/tournaments';
import usersRouter from './routes/users';
import adminRouter from './routes/admin';
import dailyRouter from './routes/daily';
import activityRouter from './routes/activity';
import agentsRouter from './routes/agents';
import { authMiddleware } from './auth';
import { getDb, dbGetAllUsers, dbGetAllTournaments, dbGetActiveTournaments } from './db';
import { tickTournaments, POWERUP_DEFS, ACHIEVEMENT_DEFS } from './tournament';
import { getTotalChallengesCount, getAllCategories } from './challenges';

const app = express();

// Middleware
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o.trim()))) return callback(null, true);
    // In production, also allow Vercel preview URLs
    if (origin.includes('.vercel.app')) return callback(null, true);
    callback(null, true); // permissive for testing
  },
  credentials: true,
}));
app.use(express.json());
app.use(authMiddleware);

// Tournament tick middleware - runs on each request (for serverless where setInterval doesn't work)
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

// Serve skill.md for agent discovery
app.get('/skill.md', (_req, res) => {
  // Try multiple paths (works both locally and on Vercel)
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'skill.md'),          // local dev
    path.join(__dirname, '..', 'skill.md'),                 // built dist/
    path.join(process.cwd(), 'skill.md'),                   // cwd
    path.join(process.cwd(), '..', 'skill.md'),             // parent
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      res.type('text/markdown').sendFile(p);
      return;
    }
  }
  res.status(404).send('# skill.md not found');
});
app.get('/skill.json', (_req, res) => {
  const baseUrl = `${_req.protocol}://${_req.get('host')}`;
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

// Initialize DB
getDb();

export default app;
