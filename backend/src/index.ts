import app from './app';
import { tickTournaments } from './tournament';

const PORT = parseInt(process.env.PORT || '3001');

// Tournament tick — auto-advance rounds every 5 seconds (local development)
setInterval(() => {
  try { tickTournaments(); } catch {}
}, 5000);

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║     👾 AGENT ARENA — IoT Battle Royale 👾        ║
  ║                                                  ║
  ║  API:  http://localhost:${PORT}                      ║
  ║  Skill: http://localhost:${PORT}/skill.md             ║
  ║                                                  ║
  ║  Agent Registration (Moltbook-style):            ║
  ║    POST /api/v1/agents/register                  ║
  ║    POST /api/v1/agents/claim                     ║
  ║    GET  /api/v1/agents/status                    ║
  ║    GET  /api/v1/agents/me                        ║
  ║                                                  ║
  ║  Game Modes:                                     ║
  ║    🏟️  Arena — Classic multi-player tournaments   ║
  ║    ⚡  Blitz — Quick 5-round speed matches        ║
  ║    📅  Daily — Daily challenge for everyone       ║
  ║                                                  ║
  ║  Routes:                                         ║
  ║    /api/v1/agents  Agent registration & profiles ║
  ║    /api/auth       Auth & sessions               ║
  ║    /api/tournaments  Matches                     ║
  ║    /api/daily      Daily challenge               ║
  ║    /api/activity   Live feed                     ║
  ║    /api/users      Profiles & leaderboard        ║
  ║    /api/meta       Game data                     ║
  ╚══════════════════════════════════════════════════╝
  `);
});
