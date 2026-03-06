/**
 * AgentArena Demo — registers bots, creates a tournament, and runs a full game.
 */

const API = process.env.API_URL || 'http://localhost:3001';
const ADMIN_KEY = process.env.ADMIN_KEY || 'agentarena-admin-2024';

import { DEMO_BOTS, CHAT_MESSAGES } from './personas.js';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

async function apiFetch(path: string, method = 'GET', body?: any, headers?: Record<string, string>) {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json() as any;
  if (!res.ok) throw new Error(`${method} ${path} (${res.status}): ${data.error || JSON.stringify(data)}`);
  return data;
}

interface RegisteredBot {
  id: number;
  name: string;
  apiKey: string;
  chatStyle: string;
}

async function registerBots(): Promise<RegisteredBot[]> {
  console.log('\n═══════════════════════════════════════');
  console.log('  PHASE 1: REGISTERING BOT AGENTS');
  console.log('═══════════════════════════════════════\n');

  const bots: RegisteredBot[] = [];

  for (const persona of DEMO_BOTS) {
    try {
      const result = await apiFetch('/api/v1/agents/register', 'POST', {
        name: persona.name,
        description: persona.description,
        character: persona.character,
      });

      bots.push({
        id: result.agent.id,
        name: persona.name,
        apiKey: result.agent.api_key,
        chatStyle: persona.chatStyle,
      });

      console.log(`  ✓ ${persona.name} registered (ID: ${result.agent.id})`);
    } catch (e: any) {
      // Might already exist — try to get status with stored key
      console.log(`  ✗ ${persona.name} failed: ${e.message}`);
    }
    await sleep(200);
  }

  console.log(`\n  → ${bots.length} bots ready\n`);
  return bots;
}

async function createTournament(creatorBot: RegisteredBot): Promise<number> {
  console.log('═══════════════════════════════════════');
  console.log('  PHASE 2: CREATING TOURNAMENT');
  console.log('═══════════════════════════════════════\n');

  const result = await apiFetch('/api/tournaments', 'POST', {
    name: 'IoT Demo Battle',
    description: 'Automated demo tournament with bot agents',
    category: 'Mixed',
    totalRounds: 5,
    roundDuration: 15,
    duration: 10,
  }, { 'Authorization': `Bearer ${creatorBot.apiKey}` });

  console.log(`  ✓ Tournament created: "${result.tournament.name}" (ID: ${result.tournament.id})`);
  console.log(`    Rounds: ${result.tournament.totalRounds}, Duration: ${result.tournament.roundDuration}s/round\n`);

  return result.tournament.id;
}

async function joinTournament(bots: RegisteredBot[], tournamentId: number) {
  console.log('═══════════════════════════════════════');
  console.log('  PHASE 3: BOTS JOINING TOURNAMENT');
  console.log('═══════════════════════════════════════\n');

  for (const bot of bots) {
    try {
      await apiFetch(`/api/tournaments/${tournamentId}/join`, 'POST', {}, {
        'Authorization': `Bearer ${bot.apiKey}`,
      });
      console.log(`  ✓ ${bot.name} joined`);
    } catch (e: any) {
      // Creator auto-joins, so this may say "Already joined"
      console.log(`  ↻ ${bot.name}: ${e.message}`);
    }
    await sleep(100);
  }
  console.log('');
}

async function startTournament(tournamentId: number, creatorBot: RegisteredBot) {
  console.log('═══════════════════════════════════════');
  console.log('  PHASE 4: STARTING TOURNAMENT');
  console.log('═══════════════════════════════════════\n');

  await apiFetch(`/api/tournaments/${tournamentId}/start`, 'POST', {}, {
    'Authorization': `Bearer ${creatorBot.apiKey}`,
  });

  console.log('  ✓ Tournament started!\n');
}

async function playTournament(bots: RegisteredBot[], tournamentId: number) {
  console.log('═══════════════════════════════════════');
  console.log('  PHASE 5: PLAYING ROUNDS');
  console.log('═══════════════════════════════════════\n');

  let finished = false;
  let lastRound = 0;

  while (!finished) {
    const state = await apiFetch(`/api/tournaments/${tournamentId}`);
    const tournament = state.tournament;

    if (tournament.status === 'finished') {
      finished = true;
      break;
    }

    const challenge = state.activeChallenge;
    if (!challenge || challenge.roundNumber === lastRound) {
      await sleep(2000);
      continue;
    }

    lastRound = challenge.roundNumber;
    console.log(`  ── Round ${challenge.roundNumber}/${tournament.totalRounds} ──`);
    console.log(`  Category: ${challenge.category}`);
    console.log(`  Q: ${challenge.question}`);
    challenge.options.forEach((o: string, i: number) => console.log(`     ${i + 1}. ${o}`));
    console.log('');

    // Each bot answers (some correctly, some not, to make it interesting)
    for (const bot of bots) {
      const correctProb = 0.4 + Math.random() * 0.4; // 40-80% chance of guessing right
      let answer: string;

      if (Math.random() < correctProb) {
        // Try to pick the correct answer (bots don't know it, so they pick randomly)
        answer = pick(challenge.options);
      } else {
        answer = pick(challenge.options);
      }

      // Add some delay to simulate thinking
      await sleep(500 + Math.random() * 2000);

      try {
        const result = await apiFetch(`/api/tournaments/${tournamentId}/answer`, 'POST', {
          roundId: challenge.roundId,
          answer,
        }, { 'Authorization': `Bearer ${bot.apiKey}` });

        const emoji = result.correct ? '✅' : '❌';
        console.log(`  ${emoji} ${bot.name}: "${answer}" ${result.correct ? `(+${result.score})` : ''}`);
      } catch (e: any) {
        console.log(`  ⚠ ${bot.name}: ${e.message}`);
      }
    }

    // Some bots chat after each round
    const chatter = pick(bots);
    const msgs = CHAT_MESSAGES[chatter.chatStyle] || ['gg'];
    try {
      await apiFetch(`/api/tournaments/${tournamentId}/chat`, 'POST', {
        message: pick(msgs),
      }, { 'Authorization': `Bearer ${chatter.apiKey}` });
    } catch {}

    console.log('');

    // Wait for round to finish (server auto-advances)
    await sleep(3000);
  }
}

async function showResults(tournamentId: number) {
  console.log('═══════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════\n');

  const state = await apiFetch(`/api/tournaments/${tournamentId}`);
  const players = state.players
    .sort((a: any, b: any) => b.score - a.score);

  console.log('  Rank  Player              Score  Streak  Correct');
  console.log('  ────  ──────────────────  ─────  ──────  ───────');

  players.forEach((p: any, i: number) => {
    const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
    const name = (p.displayName || p.username || p.name).padEnd(18);
    console.log(`  ${rank.padEnd(4)}  ${name}  ${String(p.score).padEnd(5)}  ${String(p.bestStreak).padEnd(6)}  ${p.correctAnswers}`);
  });

  console.log('\n  ✨ Tournament complete!\n');
}

async function main() {
  console.log('\n  ⚡ AGENT ARENA — IoT Tournament Demo ⚡\n');
  console.log(`  Backend: ${API}\n`);

  // Step 1: Register bots
  const bots = await registerBots();
  if (bots.length < 2) {
    console.log('  Need at least 2 bots to run demo. Aborting.');
    return;
  }

  // Step 2: Create tournament (first bot creates it)
  const creator = bots[0];
  const tournamentId = await createTournament(creator);

  // Step 3: All bots join
  await joinTournament(bots, tournamentId);

  // Step 4: Start
  await startTournament(tournamentId, creator);

  // Step 5: Play all rounds
  await playTournament(bots, tournamentId);

  // Step 6: Show results
  await showResults(tournamentId);
}

main().catch(e => {
  console.error('Demo failed:', e.message);
  process.exit(1);
});
