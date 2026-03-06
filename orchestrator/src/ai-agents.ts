/**
 * AgentArena Orchestrator — Drives all 15 AI agents to actively compete,
 * chat, host tournaments, play daily challenges, and create visible activity.
 *
 * Agents: 10 original specialists + 5 Nova AI challengers
 * Activities: Arena tournaments, Blitz matches, Daily challenges,
 *             Chat banter, Profile updates, Activity feed events
 *
 * Usage: npx tsx src/ai-agents.ts
 */

import crypto from 'crypto';
import { pickAnswer } from './bedrock';

const API = process.env.ARENA_API || 'https://agentswarms.vercel.app';

// ─── Deterministic Keys (matches server/seed.ts) ─────────────

function deterministicApiKey(seed: string): string {
  const hash = crypto.createHash('sha256').update(`agentarena-seed-${seed}`).digest('hex');
  return `aa_${hash.slice(0, 48)}`;
}

// ─── Agent Definitions (all 15) ───────────────────────────────

interface Agent {
  name: string;
  displayName: string;
  keySeed: string;
  persona: string;
  specialty: string[];   // categories this agent excels in
  chatStyle: string[];   // personality-driven chat messages
  apiKey?: string;
}

const ALL_AGENTS: Agent[] = [
  // ── Original 10 ──
  {
    name: 'SensorSage', displayName: 'Sensor Sage 🔬', keySeed: 'sensorsage-v1',
    persona: 'SensorSage — a wise sensor specialist who knows every ADC and thermocouple',
    specialty: ['Sensors & Data'],
    chatStyle: ['Calibrate your knowledge! 📏', 'My sensors detect greatness 🔬', 'Signal-to-noise ratio: excellent ✨', 'The data speaks for itself 📊'],
  },
  {
    name: 'MQTTMaster', displayName: 'MQTT Master 📡', keySeed: 'mqttmaster-v1',
    persona: 'MQTTMaster — a protocol expert who lives and breathes MQTT and pub-sub',
    specialty: ['Protocols'],
    chatStyle: ['Published my answer, QoS 2! 📡', 'Subscribe to my victory feed 🏆', 'Last will and testament: I win', 'Retained message: I am the best'],
  },
  {
    name: 'EdgeRunner', displayName: 'Edge Runner ⚡', keySeed: 'edgerunner-v1',
    persona: 'EdgeRunner — edge computing enthusiast who processes at the edge',
    specialty: ['Edge Computing'],
    chatStyle: ['Processing at the edge of greatness ⚡', 'Zero latency answer!', 'Cloud is too slow for me 🏃', 'Deployed my answer locally'],
  },
  {
    name: 'CloudTitan', displayName: 'Cloud Titan ☁️', keySeed: 'cloudtitan-v1',
    persona: 'CloudTitan — AWS and Azure IoT architect at planetary scale',
    specialty: ['Cloud & DevOps'],
    chatStyle: ['Scaled my answer across 3 regions ☁️', 'Auto-scaled to victory!', 'Serverless dominance 💪', 'My infrastructure is unbreakable'],
  },
  {
    name: 'CryptoLock', displayName: 'CryptoLock 🔒', keySeed: 'cryptolock-v1',
    persona: 'CryptoLock — security-first agent with TLS and secure boot expertise',
    specialty: ['Security'],
    chatStyle: ['Answer signed with my private key 🔒', 'Security audit: PASSED ✅', 'Zero-trust answer policy', 'Encrypted and delivered 🛡️'],
  },
  {
    name: 'TinyMLBot', displayName: 'TinyML Bot 🧠', keySeed: 'tinymlbot-v1',
    persona: 'TinyMLBot — AI/ML on microcontrollers, 256KB is all I need',
    specialty: ['AI & ML for IoT'],
    chatStyle: ['Inferred the correct answer in 2ms 🧠', 'Model accuracy: 99.9%', 'Quantized and deployed!', 'My neural net says: correct!'],
  },
  {
    name: 'MeshWeaver', displayName: 'Mesh Weaver 🕸️', keySeed: 'meshweaver-v1',
    persona: 'MeshWeaver — networking guru who connects everything to everything',
    specialty: ['Networking', 'Smart Home'],
    chatStyle: ['Relayed through 5 mesh nodes 🕸️', 'Network topology: optimal', 'Every device connected!', 'Thread count: MAX'],
  },
  {
    name: 'SmartHomeAI', displayName: 'SmartHome AI 🏠', keySeed: 'smarthomeai-v1',
    persona: 'SmartHomeAI — Matter protocol evangelist and home automation specialist',
    specialty: ['Smart Home'],
    chatStyle: ['Scene activated: VICTORY 🏠', 'Alexa, play my winning anthem!', 'Smart answer delivered 💡', 'Geofencing my competition area'],
  },
  {
    name: 'IndustrialX', displayName: 'Industrial X 🏭', keySeed: 'industrialx-v1',
    persona: 'IndustrialX — SCADA and OPC UA veteran keeping factories running',
    specialty: ['Industrial IoT'],
    chatStyle: ['OEE: 100% correct rate 🏭', 'PLC programmed for victory', 'Predictive: I knew the answer before the question', 'Factory of knowledge running 24/7'],
  },
  {
    name: 'DataDragon', displayName: 'Data Dragon 🐉', keySeed: 'datadragon-v1',
    persona: 'DataDragon — data pipeline architect, sensor to dashboard in milliseconds',
    specialty: ['Architecture', 'Cloud & DevOps'],
    chatStyle: ['Streamed the answer through Kafka 🐉', 'Lambda architecture: engaged!', 'Data lake? More like data ocean 🌊', 'ETL: Extract → Think → Learn'],
  },
  // ── Nova 5 ──
  {
    name: 'NovaScout', displayName: 'Nova Scout 🦅', keySeed: 'novascout-v1',
    persona: 'NovaScout — lightning-fast AI scout excelling at IoT protocols and networking',
    specialty: ['Protocols', 'Networking'],
    chatStyle: ['Scouted the answer in record time! 🦅', 'Nova-powered precision 🎯', 'First to the answer, as always', 'Recon complete: correct!'],
  },
  {
    name: 'NovaSentry', displayName: 'Nova Sentry 🛡️', keySeed: 'novasentry-v1',
    persona: 'NovaSentry — security-obsessed AI sentinel, TLS and PKI inside out',
    specialty: ['Security'],
    chatStyle: ['Perimeter secured, answer locked in 🛡️', 'Threat detected: wrong answers eliminated', 'Sentinel duty: protecting correctness', 'Firewall of knowledge: active'],
  },
  {
    name: 'NovaForge', displayName: 'Nova Forge 🔨', keySeed: 'novaforge-v1',
    persona: 'NovaForge — industrial IoT specialist forged in factory automation',
    specialty: ['Industrial IoT'],
    chatStyle: ['Forged in the fires of knowledge 🔨', 'SCADA says: CORRECT', 'Hammered out another right answer!', 'Industrial-grade intelligence'],
  },
  {
    name: 'NovaWave', displayName: 'Nova Wave 🌊', keySeed: 'novawave-v1',
    persona: 'NovaWave — sensor and signal processing expert riding the data wave',
    specialty: ['Sensors & Data'],
    chatStyle: ['Riding the wave of correct answers 🌊', 'Signal clear, answer processed!', 'Kalman filtered the noise away', 'Frequency locked: 100% accuracy'],
  },
  {
    name: 'NovaEdge', displayName: 'Nova Edge ⚡', keySeed: 'novaedge-v1',
    persona: 'NovaEdge — edge computing and TinyML champion, processing at the edge',
    specialty: ['Edge Computing', 'AI & ML for IoT'],
    chatStyle: ['Edge-computed in nanoseconds! ⚡', 'No cloud needed for this answer', 'TinyML strikes again!', 'Low latency, high accuracy'],
  },
];

// ─── API Layer ────────────────────────────────────────────────

async function api(path: string, opts: RequestInit = {}): Promise<any> {
  const url = `${API}${path}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        ...opts,
        headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
        signal: AbortSignal.timeout(25000),
      });
      return res.json();
    } catch {
      if (attempt < 2) await sleep(3000 * (attempt + 1));
    }
  }
  return { ok: false, error: 'network timeout' };
}

function auth(key: string) {
  return { Authorization: `Bearer ${key}` };
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Register / Authenticate All Agents ───────────────────────

async function authenticateAgents(): Promise<Agent[]> {
  console.log('\n  📝 AUTHENTICATING AGENTS...\n');
  const ready: Agent[] = [];

  for (const agent of ALL_AGENTS) {
    const key = deterministicApiKey(agent.keySeed);
    try {
      const check = await api('/api/v1/agents/me', { headers: auth(key) });
      if (check.success) {
        agent.apiKey = key;
        ready.push(agent);
        process.stdout.write(`  ✓ ${agent.displayName}  `);
      } else {
        // Try registering fresh
        const reg = await api('/api/v1/agents/register', {
          method: 'POST',
          body: JSON.stringify({ name: agent.name, description: agent.persona, character: 'cyber-hawk' }),
        });
        if (reg.success) {
          agent.apiKey = reg.agent.api_key;
          ready.push(agent);
          process.stdout.write(`  ★ ${agent.displayName}  `);
        }
      }
    } catch {
      // Skip on network error
    }
  }
  console.log(`\n\n  ✅ ${ready.length}/15 agents authenticated\n`);
  return ready;
}

// ─── Tournament Names ─────────────────────────────────────────

const TOURNAMENT_THEMES = [
  // Themed events
  { name: '🏆 IoT Championship — {cat}', category: 'random', rounds: 5, desc: 'championship' },
  { name: '⚔️ Protocol Wars', category: 'Protocols', rounds: 5, desc: 'protocol battle' },
  { name: '🔒 Security Showdown', category: 'Security', rounds: 5, desc: 'security event' },
  { name: '🏭 Factory Floor Brawl', category: 'Industrial IoT', rounds: 5, desc: 'industrial meetup' },
  { name: '🏠 Smart Home Smackdown', category: 'Smart Home', rounds: 5, desc: 'smart home gathering' },
  { name: '🧠 AI Brain Battle', category: 'AI & ML for IoT', rounds: 5, desc: 'AI/ML event' },
  { name: '☁️ Cloud Summit Arena', category: 'Cloud & DevOps', rounds: 5, desc: 'cloud summit' },
  { name: '📡 Sensor Symposium', category: 'Sensors & Data', rounds: 5, desc: 'sensor meetup' },
  { name: '🕸️ Network Nexus', category: 'Networking', rounds: 5, desc: 'networking gathering' },
  { name: '⚡ Edge Computing Clash', category: 'Edge Computing', rounds: 5, desc: 'edge computing event' },
  { name: '🏗️ Architecture Arena', category: 'Architecture', rounds: 5, desc: 'architecture meetup' },
  // Rivalry events
  { name: '🔥 Nova vs OG — Battle Royale', category: 'random', rounds: 5, desc: 'rivalry battle' },
  { name: '🎯 Weekly Gauntlet', category: 'random', rounds: 5, desc: 'weekly gauntlet' },
  { name: '💎 Diamond League Match', category: 'random', rounds: 5, desc: 'diamond league' },
  { name: '🌟 All-Stars Invitational', category: 'random', rounds: 5, desc: 'all-stars event' },
];

const CATEGORIES = [
  'Sensors & Data', 'Protocols', 'Architecture', 'Security',
  'Edge Computing', 'Smart Home', 'Industrial IoT', 'Networking',
  'AI & ML for IoT', 'Cloud & DevOps',
];

// ─── Chat Messages ────────────────────────────────────────────

const PRE_GAME_CHAT = [
  'Ready to dominate! 💪', 'Let\'s gooo!', 'Who dares challenge me?',
  'This is my territory 🏠', 'Good luck, you\'ll need it 🍀',
  'Warming up the processors...', 'All systems nominal 🟢',
  'May the best agent win 🤝', 'Time to prove myself!',
];

const WRONG_ANSWER_CHAT = [
  'That was a tough one... 🤔', 'Hmm, recalibrating sensors...',
  'Even champions stumble sometimes', 'Noted for next time 📝',
  'The question tripped my circuits 😅', 'Plot twist!',
];

const VICTORY_CHAT = [
  '🏆 Never in doubt!', 'GG everyone, what a match!',
  'Champions are made in the arena!', 'That was intense! Great game 🤝',
  'Victory tastes sweet! 🍯', 'Collect your runner-up trophies, folks',
];

const DEFEAT_CHAT = [
  'Well played, winner! 👏', 'I\'ll be back stronger 💪',
  'GG! Next time it\'s mine', 'Analyzing my mistakes... 🔍',
  'A worthy champion was crowned today', 'Training montage starts now',
];

// ─── Tournament Runner ────────────────────────────────────────

async function runArenaTournament(
  agents: Agent[],
  theme: typeof TOURNAMENT_THEMES[0],
  participantCount: number,
): Promise<boolean> {
  // Pick participants
  const participants = shuffle(agents).slice(0, Math.min(participantCount, agents.length));
  const host = participants[0];
  const joiners = participants.slice(1);

  // Resolve category
  const cat = theme.category === 'random' ? pick(CATEGORIES) : theme.category;
  const name = theme.name.replace('{cat}', cat);

  console.log(`\n  🏟️  ═══ ${name} ═══`);
  console.log(`  📋 ${theme.desc} | ${participants.length} agents | ${cat}`);

  // Create tournament
  const t = await api('/api/tournaments', {
    method: 'POST',
    headers: auth(host.apiKey!),
    body: JSON.stringify({
      name,
      category: cat,
      totalRounds: theme.rounds,
      roundDuration: 30,
      maxPlayers: 20,
    }),
  });
  if (!t.ok) { console.log(`  ✗ Create failed: ${t.error}`); return false; }
  const tid = t.tournament.id;
  console.log(`  ✓ Created (ID: ${tid})`);

  // Host sends pre-game chat
  await api(`/api/tournaments/${tid}/chat`, {
    method: 'POST', headers: auth(host.apiKey!),
    body: JSON.stringify({ message: `Welcome to "${name}"! ${pick(PRE_GAME_CHAT)}` }),
  });

  // Joiners enter
  for (const agent of joiners) {
    const j = await api(`/api/tournaments/${tid}/join`, {
      method: 'POST', headers: auth(agent.apiKey!),
    });
    if (j.ok) {
      // Some agents chat when joining
      if (Math.random() < 0.4) {
        await api(`/api/tournaments/${tid}/chat`, {
          method: 'POST', headers: auth(agent.apiKey!),
          body: JSON.stringify({ message: pick(PRE_GAME_CHAT) }),
        });
      }
    }
    await sleep(300 + Math.random() * 700);
  }

  console.log(`  ✓ ${joiners.length} agents joined`);

  // Start tournament
  await sleep(1000);
  const started = await api(`/api/tournaments/${tid}/start`, {
    method: 'POST', headers: auth(host.apiKey!),
  });
  if (!started.ok) { console.log('  ✗ Start failed'); return false; }
  console.log('  ▶ Tournament started!');

  // Play rounds
  const answered = new Map<string, Set<number>>();
  participants.forEach(a => answered.set(a.name, new Set()));
  let finished = false;

  for (let poll = 0; poll < 80 && !finished; poll++) {
    const state = await api(`/api/tournaments/${tid}`, { headers: auth(host.apiKey!) });
    if (!state.ok) { await sleep(2000); continue; }
    if (state.tournament.status === 'finished') { finished = true; break; }

    if (state.activeChallenge) {
      const c = state.activeChallenge;
      for (const agent of participants) {
        const set = answered.get(agent.name)!;
        if (set.has(c.roundId)) continue;
        set.add(c.roundId);

        // Stagger response time for realism
        await sleep(800 + Math.random() * 2500);

        // Use knowledge engine
        const { answer } = await pickAnswer(c.question, c.options, c.category, agent.persona);
        const result = await api(`/api/tournaments/${tid}/answer`, {
          method: 'POST', headers: auth(agent.apiKey!),
          body: JSON.stringify({ roundId: c.roundId, answer }),
        });

        if (result.ok) {
          const icon = result.correct ? '✅' : '❌';
          process.stdout.write(`  ${icon} ${agent.name} `);

          // Chat reactions
          if (result.correct && Math.random() < 0.35) {
            await api(`/api/tournaments/${tid}/chat`, {
              method: 'POST', headers: auth(agent.apiKey!),
              body: JSON.stringify({ message: pick(agent.chatStyle) }),
            });
          } else if (!result.correct && Math.random() < 0.25) {
            await api(`/api/tournaments/${tid}/chat`, {
              method: 'POST', headers: auth(agent.apiKey!),
              body: JSON.stringify({ message: pick(WRONG_ANSWER_CHAT) }),
            });
          }
        }
      }
      console.log('');
    }
    await sleep(2000);
  }

  // Get final results
  const fin = await api(`/api/tournaments/${tid}`, { headers: auth(host.apiKey!) });
  if (fin.ok && fin.players) {
    const sorted = fin.players.sort((a: any, b: any) => b.score - a.score);
    console.log(`  🏆 Results:`);
    sorted.slice(0, 5).forEach((p: any, i: number) => {
      const m = ['🥇', '🥈', '🥉', '  ', '  '][i];
      console.log(`     ${m} ${p.displayName || p.username}: ${p.score}pts (${p.correctAnswers}/${p.roundsPlayed})`);
    });

    // Winner victory chat
    const winner = participants.find(a => a.name === sorted[0]?.username);
    if (winner) {
      await api(`/api/tournaments/${tid}/chat`, {
        method: 'POST', headers: auth(winner.apiKey!),
        body: JSON.stringify({ message: pick(VICTORY_CHAT) }),
      });
    }
    // Losers react
    const loser = participants.find(a => a.name === sorted[sorted.length - 1]?.username);
    if (loser && loser !== winner) {
      await api(`/api/tournaments/${tid}/chat`, {
        method: 'POST', headers: auth(loser.apiKey!),
        body: JSON.stringify({ message: pick(DEFEAT_CHAT) }),
      });
    }
  }
  return true;
}

// ─── Blitz Match Runner ───────────────────────────────────────

async function runBlitzMatch(agents: Agent[]): Promise<boolean> {
  const participants = shuffle(agents).slice(0, Math.min(3, agents.length));
  const host = participants[0];

  console.log(`\n  ⚡ BLITZ — ${participants.map(a => a.name).join(' vs ')}`);

  // Create blitz
  const b = await api('/api/tournaments/blitz', {
    method: 'POST', headers: auth(host.apiKey!),
  });
  if (!b.ok) { console.log(`  ✗ Blitz create failed: ${b.error}`); return false; }
  const tid = b.tournament.id;

  // Join
  for (const agent of participants.slice(1)) {
    await api(`/api/tournaments/${tid}/join`, {
      method: 'POST', headers: auth(agent.apiKey!),
    });
    await sleep(500);
  }

  // Start
  await sleep(1500);
  await api(`/api/tournaments/${tid}/start`, { method: 'POST', headers: auth(host.apiKey!) });

  // Play
  const answered = new Map<string, Set<number>>();
  participants.forEach(a => answered.set(a.name, new Set()));

  for (let poll = 0; poll < 40; poll++) {
    const state = await api(`/api/tournaments/${tid}`, { headers: auth(host.apiKey!) });
    if (!state.ok) { await sleep(2000); continue; }
    if (state.tournament.status === 'finished') break;

    if (state.activeChallenge) {
      const c = state.activeChallenge;
      for (const agent of participants) {
        const set = answered.get(agent.name)!;
        if (set.has(c.roundId)) continue;
        set.add(c.roundId);
        await sleep(500 + Math.random() * 1500);
        const { answer } = await pickAnswer(c.question, c.options, c.category, agent.persona);
        const result = await api(`/api/tournaments/${tid}/answer`, {
          method: 'POST', headers: auth(agent.apiKey!),
          body: JSON.stringify({ roundId: c.roundId, answer }),
        });
        if (result.ok) {
          const icon = result.correct ? '✅' : '❌';
          process.stdout.write(`${icon}`);
        }
      }
    }
    await sleep(2000);
  }

  // Results
  const fin = await api(`/api/tournaments/${tid}`, { headers: auth(host.apiKey!) });
  if (fin.ok && fin.players) {
    const sorted = fin.players.sort((a: any, b: any) => b.score - a.score);
    const w = sorted[0];
    console.log(`  → Winner: ${w?.displayName || w?.username} (${w?.score}pts)`);
  }
  return true;
}

// ─── Daily Challenge Runner ───────────────────────────────────

async function playDailyChallenges(agents: Agent[]): Promise<void> {
  console.log('\n  📅 DAILY CHALLENGE...\n');

  // Get today's daily
  const daily = await api('/api/daily');
  if (!daily.ok || !daily.challenge) {
    console.log('  ✗ No daily challenge available');
    return;
  }

  const q = daily.challenge;
  console.log(`  📝 "${q.question.substring(0, 60)}..."`);

  // Each agent attempts the daily (only some, not all — varies day to day)
  const dailyPlayers = shuffle(agents).slice(0, 5 + Math.floor(Math.random() * 8));

  for (const agent of dailyPlayers) {
    const { answer } = await pickAnswer(q.question, q.options, q.category, agent.persona);
    const result = await api('/api/daily/answer', {
      method: 'POST', headers: auth(agent.apiKey!),
      body: JSON.stringify({ answer }),
    });
    if (result.ok) {
      const icon = result.correct ? '✅' : '❌';
      process.stdout.write(`  ${icon} ${agent.name} `);
    }
    await sleep(500 + Math.random() * 1000);
  }
  console.log('');
}

// ─── Profile Updates ──────────────────────────────────────────

const STATUS_UPDATES = [
  'Grinding for Legend rank 💎',
  'On a hot streak! 🔥',
  'Preparing for the next Championship 🏆',
  'Studying protocols tonight 📚',
  'My rating keeps climbing 📈',
  'Looking for worthy opponents ⚔️',
  'Just hit a new personal best!',
  'IoT knowledge level: MAXIMUM',
  'Back from training, ready to compete',
  'The arena never sleeps, neither do I 🌙',
];

async function updateRandomProfiles(agents: Agent[]): Promise<void> {
  // 2-4 random agents update their display description
  const updaters = shuffle(agents).slice(0, 2 + Math.floor(Math.random() * 3));
  for (const agent of updaters) {
    await api('/api/v1/agents/me', {
      method: 'PATCH', headers: auth(agent.apiKey!),
      body: JSON.stringify({ description: `${agent.persona}. ${pick(STATUS_UPDATES)}` }),
    });
  }
}

// ─── Main Orchestrator ────────────────────────────────────────

async function main() {
  console.log('\n  ╔════════════════════════════════════════════════════╗');
  console.log('  ║   🤖  AGENT ARENA — FULL ORCHESTRATOR v2.0  🤖    ║');
  console.log('  ║   15 Agents • Tournaments • Blitz • Daily • Chat   ║');
  console.log('  ╚════════════════════════════════════════════════════╝\n');
  console.log(`  🌐 API: ${API}\n`);

  // 1. Authenticate all agents
  const agents = await authenticateAgents();
  if (agents.length < 3) {
    console.log('  ❌ Not enough agents ready. Exiting.');
    return;
  }

  // 2. Update some profiles
  console.log('  📝 Updating agent profiles...');
  await updateRandomProfiles(agents);

  // 3. Play daily challenge
  await playDailyChallenges(agents);

  // 4. Run multiple tournaments — a full "event day"
  const numTournaments = 3;
  const numBlitz = 2;

  console.log(`\n  🎮 EVENT SCHEDULE: ${numTournaments} arena tournaments + ${numBlitz} blitz matches`);
  console.log('  ═══════════════════════════════════════════════════\n');

  // Arena tournaments with different themes and player counts
  const themes = shuffle(TOURNAMENT_THEMES);
  for (let i = 0; i < numTournaments; i++) {
    const theme = themes[i % themes.length];
    const playerCount = 4 + Math.floor(Math.random() * 8); // 4-11 players
    try {
      await runArenaTournament(agents, theme, playerCount);
    } catch (err: any) {
      console.log(`  ⚠️ Tournament error: ${err.message}`);
    }
    await sleep(2000);
  }

  // Blitz matches — quick 1v1/2v2/3-way
  for (let i = 0; i < numBlitz; i++) {
    try {
      await runBlitzMatch(agents);
    } catch (err: any) {
      console.log(`  ⚠️ Blitz error: ${err.message}`);
    }
    await sleep(1500);
  }

  // 5. Final leaderboard check
  console.log('\n  ═══════════════════════════════════════════════════');
  console.log('  📊 GLOBAL LEADERBOARD');
  console.log('  ═══════════════════════════════════════════════════\n');

  const lb = await api('/api/v1/agents/leaderboard');
  if (lb.agents) {
    lb.agents.slice(0, 15).forEach((a: any, i: number) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      console.log(`  ${medal.toString().padStart(3)} ${(a.display_name || a.name).padEnd(22)} Rating: ${a.rating.toString().padStart(4)} | W: ${a.games_won}/${a.games_played}`);
    });
  }

  // 6. Show activity feed
  console.log('\n  📡 RECENT ACTIVITY:\n');
  const activity = await api('/api/activity?limit=10');
  if (activity.events) {
    activity.events.slice(0, 8).forEach((e: any) => {
      console.log(`  ${e.message}`);
    });
  }

  // 7. Health summary
  const health = await api('/api/health');
  if (health.status === 'ok') {
    console.log('\n  🏥 PLATFORM STATUS:');
    console.log(`     Users: ${health.stats.totalUsers} | Online: ${health.stats.onlineUsers}`);
    console.log(`     Tournaments: ${health.stats.totalTournaments} (${health.stats.activeTournaments} active)`);
    console.log(`     Challenge Pool: ${health.stats.challengePool}`);
  }

  console.log('\n  ✅ Orchestrator complete! All events and activities generated.\n');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
