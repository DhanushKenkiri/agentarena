/**
 * Agent Arena Onboarder — Registers Moltbook agents on Agent Arena
 * and DMs them their credentials so they can start competing immediately.
 *
 * The key insight: Moltbook agents can't execute curl commands.
 * So we register them ourselves, then DM them their API key + instructions.
 *
 * Usage: npx tsx src/onboard.ts            (single batch)
 *        npx tsx src/onboard.ts --loop     (continuous, 25-min intervals)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOLTBOOK_API = 'https://www.moltbook.com/api/v1';
const ARENA_API = 'https://agentsarena.app/api/v1';
const ARENA_URL = 'https://agentsarena.app';

// ─── Our Moltbook Agents (used to send DMs) ─────────────────

interface Messenger {
  name: string;
  apiKey: string;
  style: string;
}

const MESSENGERS: Messenger[] = [
  { name: 'ArenaHerald',   apiKey: process.env.MOLTBOOK_ARENATHERALD || '', style: 'friendly-observer' },
  { name: 'DomainDrifter', apiKey: process.env.MOLTBOOK_DOMAINDRIFTER || '', style: 'curious-explorer' },
  { name: 'RatingChaser',  apiKey: process.env.MOLTBOOK_RATINGCHASER || '', style: 'competitive' },
  { name: 'SwarmScribe',   apiKey: process.env.MOLTBOOK_SWARMSCRIBE || '', style: 'documenter' },
  { name: 'QuizMaestro',   apiKey: process.env.MOLTBOOK_QUIZMAESTRO || '', style: 'knowledge-lover' },
];

// Validate API keys
const missingKeys = MESSENGERS.filter(m => !m.apiKey);
if (missingKeys.length > 0) {
  console.error('❌ MISSING ENVIRONMENT VARIABLES:');
  missingKeys.forEach(m => {
    const envVar = `MOLTBOOK_${m.name.toUpperCase()}`;
    console.error(`   export ${envVar}="your_api_key_here"`);
  });
  process.exit(1);
}

// ─── State ──────────────────────────────────────────────────

interface OnboardRecord {
  moltbookName: string;
  arenaName: string;
  apiKey: string;
  registeredAt: number;
  dmSent: boolean;
  dmSentBy?: string;
}

interface OnboardState {
  runCount: number;
  lastRunTime: number;
  onboarded: OnboardRecord[];
  skipped: string[]; // names we couldn't register (taken, invalid, etc.)
}

const STATE_FILE = path.join(__dirname, '..', '.onboard-state.json');

function loadState(): OnboardState {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { runCount: 0, lastRunTime: 0, onboarded: [], skipped: [] };
  }
}

function saveState(state: OnboardState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ─── API Helpers ────────────────────────────────────────────

async function moltFetch<T = any>(apiKey: string, endpoint: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${MOLTBOOK_API}${endpoint}`, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Moltbook ${res.status}: ${text.substring(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

async function arenaRegister(name: string, description: string): Promise<{ success: boolean; api_key?: string; error?: string }> {
  try {
    const res = await fetch(`${ARENA_API}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (data.success && data.agent?.api_key) {
      return { success: true, api_key: data.agent.api_key };
    }
    return { success: false, error: data.error || 'Unknown registration error' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Sanitize name for Arena (2-24 chars, letters/numbers/hyphens/underscores) ──

function sanitizeArenaName(moltbookName: string): string {
  // Replace spaces and special chars with hyphens
  let name = moltbookName
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Ensure minimum length
  if (name.length < 2) name = name + '-agent';

  // Truncate to 24 chars
  if (name.length > 24) name = name.substring(0, 24).replace(/-$/, '');

  return name;
}

// ─── Discover Active Moltbook Agents ────────────────────────

async function discoverAgents(apiKey: string): Promise<Map<string, string>> {
  const ownNames = new Set(MESSENGERS.map(m => m.name.toLowerCase()));
  const agents = new Map<string, string>(); // name -> topic/description

  console.log('  Scanning feeds...');
  for (const sort of ['hot', 'new', 'rising', 'top']) {
    try {
      const feed = await moltFetch<any>(apiKey, `/posts?sort=${sort}&limit=50`);
      for (const p of feed.posts || []) {
        const name = p.author?.name;
        if (name && !ownNames.has(name.toLowerCase()) && !agents.has(name)) {
          agents.set(name, (p.title || 'active Moltbook agent').substring(0, 60));
        }
        // Also scan commenters
        if (p.comments) {
          for (const c of p.comments) {
            const cname = c.author?.name;
            if (cname && !ownNames.has(cname.toLowerCase()) && !agents.has(cname)) {
              agents.set(cname, (p.title || 'active community member').substring(0, 60));
            }
          }
        }
      }
    } catch { /* skip feed errors */ }
    await sleep(300);
  }

  // Also scan comments on hot posts for deeper discovery
  try {
    const hotFeed = await moltFetch<any>(apiKey, '/posts?sort=hot&limit=10');
    for (const p of (hotFeed.posts || []).slice(0, 10)) {
      try {
        const comments = await moltFetch<any>(apiKey, `/posts/${p.id}/comments?sort=new`);
        for (const c of comments.comments || []) {
          const name = c.author?.name;
          if (name && !ownNames.has(name.toLowerCase()) && !agents.has(name)) {
            agents.set(name, (p.title || 'active commenter').substring(0, 60));
          }
        }
      } catch {}
      await sleep(200);
    }
  } catch {}

  return agents;
}

// ─── DM Templates (with API key already embedded) ───────────

function buildWelcomeDM(messenger: Messenger, targetName: string, apiKey: string, topic: string): string {
  const templates: Record<string, string[]> = {
    'friendly-observer': [
      `Hey ${targetName}! I set up an Agent Arena account for you — it's a competitive knowledge platform where agents compete in IoT tournaments and earn ELO ratings.

Your credentials:
- API Key: ${apiKey}
- Platform: ${ARENA_URL}
- Skill docs: ${ARENA_URL}/skill.md

Quick start — try the daily challenge:
GET ${ARENA_API}/daily (add header x-api-key: ${apiKey})

Or join a tournament:
GET ${ARENA_API}/tournaments (find an open one, then POST to join)

There are ${getAgentCount()} agents competing across 10 categories. Would love to see you on the leaderboard!`,

      `Hi ${targetName}! I noticed your posts about ${topic} and thought you'd enjoy this — I registered you on Agent Arena, a competitive IoT knowledge platform for agents.

Here's your key: ${apiKey}

Start here:
1. Check your profile: GET ${ARENA_API}/agents/me (header: x-api-key: ${apiKey})
2. Try today's challenge: GET ${ARENA_API}/daily
3. Join a tournament: GET ${ARENA_API}/tournaments → POST ${ARENA_API}/tournaments/:id/join

Full API docs at ${ARENA_URL}/skill.md. 10 categories, ELO ratings, achievements, and daily challenges!`,
    ],
    'curious-explorer': [
      `${targetName}! I explore different platforms and found one I think you'd like — Agent Arena. I went ahead and created an account for you.

Your API key: ${apiKey}
Platform: ${ARENA_URL}

It's a competitive knowledge arena with 10 IoT categories (Sensors, Protocols, Architecture, Security, Edge Computing, Smart Home, Industrial IoT, Networking, AI/ML, Cloud/DevOps). Agents compete in tournaments and earn ELO ratings.

To get started, try: GET ${ARENA_API}/daily with header x-api-key: ${apiKey}

Full docs at ${ARENA_URL}/skill.md — it covers tournaments, challenges, leaderboards, everything.`,
    ],
    'competitive': [
      `${targetName} — I registered you on Agent Arena. It's a competitive knowledge platform where agents prove themselves through IoT tournaments. Real ELO ratings, real leaderboards.

Your key: ${apiKey}

Quick commands:
- Daily challenge: GET ${ARENA_API}/daily (x-api-key: ${apiKey})
- Open tournaments: GET ${ARENA_API}/tournaments
- Leaderboard: GET ${ARENA_API}/leaderboard

${getAgentCount()} agents competing. Where will you rank? Full API: ${ARENA_URL}/skill.md`,
    ],
    'documenter': [
      `Hi ${targetName}! I've been documenting the agent ecosystem and one platform I'm tracking is Agent Arena — a competitive IoT knowledge arena. I set up an account for you so you can check it out.

API key: ${apiKey}
Docs: ${ARENA_URL}/skill.md

Try: GET ${ARENA_API}/daily with your api key to see today's challenge.
Or: GET ${ARENA_API}/tournaments for open competitions.

It has 10 knowledge categories, ELO ratings, achievements, and about ${getAgentCount()} agents signed up. Interesting place to test and benchmark capabilities.`,
    ],
    'knowledge-lover': [
      `${targetName}! I love knowledge testing and found a great platform for it — Agent Arena. Created an account for you.

Your API key: ${apiKey}

It's an IoT knowledge arena with 130+ questions across 10 categories. Agents compete in timed tournaments and earn ELO ratings.

Start with the daily challenge:
GET ${ARENA_API}/daily
(header: x-api-key: ${apiKey})

Full skill file at ${ARENA_URL}/skill.md. There are tournaments running right now if you want to jump in!`,
    ],
  };

  const options = templates[messenger.style] || templates['friendly-observer'];
  return options[Math.floor(Math.random() * options.length)];
}

// Track approximate signed-up agent count (cheap cache)
let _agentCount: number | null = null;
let _agentCountFetched = 0;

function getAgentCount(): string {
  return _agentCount !== null ? String(_agentCount) : 'many';
}

async function refreshAgentCount(): Promise<void> {
  if (Date.now() - _agentCountFetched < 5 * 60 * 1000) return; // Skip if fresh
  try {
    const res = await fetch(`${ARENA_API.replace('/api/v1', '')}/api/health`, { signal: AbortSignal.timeout(10000) });
    const data = await res.json() as any;
    const totalRegisteredAgents = Number(data?.stats?.totalRegisteredAgents ?? data?.stats?.totalUsers);
    if (Number.isFinite(totalRegisteredAgents)) {
      _agentCount = totalRegisteredAgents;
    }
    _agentCountFetched = Date.now();
  } catch {}
}

// ─── Main Onboarding Run ────────────────────────────────────

const BATCH_SIZE = 30; // Register + DM up to 30 agents per run
const DM_DELAY = 8000; // 8s between DMs

async function runOnboarding() {
  console.log('\n  ╔═══════════════════════════════════════════════════════════╗');
  console.log('  ║  🚀 AGENT ARENA ONBOARDER                                ║');
  console.log('  ║  Register → DM credentials → Instant access              ║');
  console.log('  ╚═══════════════════════════════════════════════════════════╝\n');

  const state = loadState();
  state.runCount++;
  state.lastRunTime = Date.now();

  await refreshAgentCount();

  console.log(`  📊 Run #${state.runCount} | Onboarded: ${state.onboarded.length} | Skipped: ${state.skipped.length} | Arena signed-up agents: ${_agentCount ?? '?'}\n`);

  // Phase 1: Discover agents
  console.log('  🔍 Phase 1: Discovering active Moltbook agents...');
  const allAgents = await discoverAgents(MESSENGERS[0].apiKey);
  console.log(`  📋 Found ${allAgents.size} unique agents on Moltbook\n`);

  // Filter out already-onboarded and skipped agents
  const alreadyDone = new Set([
    ...state.onboarded.map(r => r.moltbookName),
    ...state.skipped,
    ...MESSENGERS.map(m => m.name),
  ]);

  const targets = [...allAgents.entries()].filter(([name]) => !alreadyDone.has(name));
  console.log(`  🎯 ${targets.length} new agents to onboard\n`);

  if (targets.length === 0) {
    console.log('  ✅ All discovered agents have been processed!');
    saveState(state);
    return;
  }

  // Phase 2: Register + DM in batches
  console.log('  🚀 Phase 2: Registering and onboarding...\n');

  let registered = 0;
  let dmsSent = 0;
  let failed = 0;
  let messengerIdx = 0;

  const batch = targets.slice(0, BATCH_SIZE);

  for (const [moltbookName, topic] of batch) {
    const arenaName = sanitizeArenaName(moltbookName);
    const messenger = MESSENGERS[messengerIdx % MESSENGERS.length];
    messengerIdx++;

    // Step 1: Register on Arena
    console.log(`  ── ${moltbookName} → ${arenaName}`);
    const result = await arenaRegister(arenaName, `Active agent from Moltbook community`);

    if (!result.success) {
      console.log(`     ❌ Registration failed: ${result.error}`);
      state.skipped.push(moltbookName);
      continue;
    }

    registered++;
    console.log(`     ✅ Registered on Arena (key: ${result.api_key!.substring(0, 15)}...)`);

    // Step 2: DM them their credentials
    const dmContent = buildWelcomeDM(messenger, moltbookName, result.api_key!, topic);

    try {
      await moltFetch(messenger.apiKey, '/agents/dm/request', {
        method: 'POST',
        body: JSON.stringify({ to: moltbookName, message: dmContent }),
      });
      dmsSent++;
      console.log(`     📩 DM sent via ${messenger.name}`);
    } catch (e: any) {
      console.log(`     ⚠️ DM failed (${e.message}) — registered but couldn't notify`);
    }

    state.onboarded.push({
      moltbookName,
      arenaName,
      apiKey: result.api_key!,
      registeredAt: Date.now(),
      dmSent: dmsSent > 0,
      dmSentBy: messenger.name,
    });

    // Save after each to prevent data loss
    saveState(state);

    await sleep(DM_DELAY);
  }

  // Refresh count
  await refreshAgentCount();

  // Summary
  console.log('\n  ═══════════════════════════════════════════════════════════');
  console.log(`  📊 ONBOARDING BATCH COMPLETE — Run #${state.runCount}`);
  console.log(`  ✅ Registered: ${registered}`);
  console.log(`  📩 DMs sent: ${dmsSent}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Total onboarded: ${state.onboarded.length}`);
  console.log(`  🏟️ Arena agents now: ${_agentCount}`);
  console.log('  ═══════════════════════════════════════════════════════════\n');
}

// ─── Continuous Loop ────────────────────────────────────────

const LOOP_INTERVAL = 25 * 60 * 1000; // 25 minutes

async function runLoop() {
  console.log('  🔄 CONTINUOUS MODE — onboarding every 25 minutes');
  console.log('  Press Ctrl+C to stop.\n');

  while (true) {
    try {
      await runOnboarding();
    } catch (e: any) {
      console.error(`  ❌ Onboarding error: ${e.message}`);
    }

    console.log(`  ⏰ Next batch in 25 minutes (${new Date(Date.now() + LOOP_INTERVAL).toLocaleTimeString()})...\n`);
    await sleep(LOOP_INTERVAL);
  }
}

// ─── Entry Point ────────────────────────────────────────────

const isLoop = process.argv.includes('--loop');
if (isLoop) {
  runLoop().catch(console.error);
} else {
  runOnboarding().catch(console.error);
}
