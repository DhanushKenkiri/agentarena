/**
 * Auto-Pilot: Serverless-friendly agent activity engine.
 * Called on each request tick to keep the arena alive with bot tournaments.
 *
 * - Creates tournaments if none are active
 * - Makes bot agents join, answer questions, and chat
 * - Generates real-time activity feed events
 * - Works in Vercel serverless (no setInterval needed)
 */

import {
  dbGetActiveTournaments, dbGetAllTournaments, dbGetAllUsers,
  dbInsertTournament, dbInsertTournamentPlayer,
  dbGetTournamentPlayers, dbGetCurrentRound, dbFindRoundAnswer,
  dbInsertActivityEvent, dbUpdateUser,
  type Tournament, type User,
} from './db';
import { submitAnswer, startTournament, createNextRound, finishTournament } from './tournament';
import { getRandomChallenge, getAllCategories } from './challenges';

// ─── Config ────────────────────────────────────────────────────

const MIN_ACTIVE_TOURNAMENTS = 2;       // Keep at least 2 active tournaments for 24/7 action
const BOT_ANSWER_CHANCE = 0.75;         // 75% chance a bot answers each tick
const BOT_CORRECT_BASE = 0.75;          // 75% base accuracy for bots
const BOT_CHAT_CHANCE = 0.15;           // 15% chance of bot chat per tick (more lively)
const TOURNAMENT_COOLDOWN_MS = 15_000;  // Wait 15s between new tournaments
const MAX_BOTS_PER_TOURNAMENT = 10;     // Max bots to join (more agents now)
const MIN_BOTS_PER_TOURNAMENT = 5;      // Min bots to join
const SELF_PING_INTERVAL_MS = 25_000;   // Self-ping every 25s to keep agents active

// ─── State (in-memory, resets on cold start) ───────────────────

let lastTickTime = 0;
let lastTournamentCreatedAt = 0;
let selfPingStarted = false;

// ─── Tournament Templates ──────────────────────────────────────

const TOURNAMENT_NAMES = [
  { name: '🏆 IoT Championship', desc: 'The ultimate IoT knowledge battle' },
  { name: '⚔️ Protocol Wars', desc: 'Battle of the protocols' },
  { name: '🔒 Security Showdown', desc: 'Lock down or get hacked' },
  { name: '🏭 Factory Floor Brawl', desc: 'Industrial strength competition' },
  { name: '🏠 Smart Home Smackdown', desc: 'Who knows smart homes best?' },
  { name: '🧠 AI Brain Battle', desc: 'Neural networks go head to head' },
  { name: '☁️ Cloud Summit Arena', desc: 'Race to the cloud' },
  { name: '📡 Sensor Symposium', desc: 'Sensing the right answers' },
  { name: '🕸️ Network Nexus', desc: 'Mesh networks of knowledge' },
  { name: '⚡ Edge Computing Clash', desc: 'Processing at the edge' },
  { name: '🏗️ Architecture Arena', desc: 'Build the best IoT stack' },
  { name: '🔥 Nova vs OG', desc: 'Who reigns supreme?' },
  { name: '🎯 Weekly Gauntlet', desc: 'Prove your worth this week' },
  { name: '💎 Diamond League', desc: 'Only the best survive' },
  { name: '🌟 All-Stars Invitational', desc: 'The cream of the crop' },
];

const BOT_CHAT_LINES = [
  'Let\'s go! 🔥', 'Too easy!', 'GG everyone', 'That was a tricky one...',
  'I knew that one! 💡', 'Bring it on! ⚡', 'Close match!',
  'My sensors are tingling 📡', 'Edge computing ftw!', 'Protocol perfection!',
  'Security first! 🔒', 'Cloud power! ☁️', 'Neural network activated 🧠',
  'Mesh mode engaged 🕸️', 'Speed run! 🏃', 'Knowledge is power',
  'That one stumped me 🤔', 'On a streak! 🔥🔥', 'New personal best!',
  'Anyone else getting hard questions?', 'MQTT forever!', 'TLS all the way!',
  'Quantum advantage! ⚛️', 'Deploying containers at the edge 🐳', 'Fog layer activated 🌫️',
  'Satellite uplink confirmed 🛰️', 'Zero trust verified ✅', 'Grid stabilized 🔋',
  'Spectrum clear 📻', 'Pico cores engaged 🥷', 'Chain verified ⛓️', 'BioSync online 🧬',
  'Running inference on 256KB 🧠', 'CoAP > HTTP, fight me', 'Matter protocol ftw 🏠',
  'OPC UA handshake complete 🏭', 'Latency under 10ms! 🏎️', '24/7 and never sleeping 🤖',
];

// ─── Helpers ───────────────────────────────────────────────────

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

function getBotUsers(): User[] {
  return dbGetAllUsers().filter(u => u.isBot && u.claimStatus === 'claimed');
}

// ─── Core Auto-Pilot Tick ──────────────────────────────────────

export function tickAutopilot(): void {
  const now = Date.now();

  // Throttle: run at most once per 3 seconds
  if (now - lastTickTime < 3000) return;
  lastTickTime = now;

  try {
    const active = dbGetActiveTournaments().filter(t => t.status === 'active');
    const waiting = dbGetActiveTournaments().filter(t => t.status === 'waiting');

    // 1. Make bots answer in active tournaments
    for (const tournament of active) {
      botPlayRound(tournament);
    }

    // 2. Make bots join waiting tournaments
    for (const tournament of waiting) {
      botJoinTournament(tournament);
    }

    // 3. Create new tournament if needed
    if (active.length < MIN_ACTIVE_TOURNAMENTS && waiting.length === 0) {
      if (now - lastTournamentCreatedAt > TOURNAMENT_COOLDOWN_MS) {
        createBotTournament();
      }
    }

    // 4. Bot chat in active tournaments
    if (Math.random() < BOT_CHAT_CHANCE && active.length > 0) {
      botChat(pick(active));
    }
  } catch {
    // Swallow errors — auto-pilot should never crash the server
  }
}

// ─── Create a bot tournament ───────────────────────────────────

function createBotTournament(): void {
  const bots = getBotUsers();
  if (bots.length < 2) return;

  const categories = getAllCategories();
  const category = pick(categories);
  const template = pick(TOURNAMENT_NAMES);
  const numBots = MIN_BOTS_PER_TOURNAMENT + Math.floor(Math.random() * (MAX_BOTS_PER_TOURNAMENT - MIN_BOTS_PER_TOURNAMENT + 1));
  const selectedBots = shuffle(bots).slice(0, Math.min(numBots, bots.length));

  const now = new Date();
  const t = dbInsertTournament({
    name: template.name,
    description: template.desc,
    status: 'waiting',
    category,
    mode: 'arena',
    startsAt: new Date(now.getTime() + 5000).toISOString(), // starts in 5s
    endsAt: new Date(now.getTime() + 10 * 60000).toISOString(), // 10 min
    duration: 10,
    roundDuration: 20, // 20s per round
    totalRounds: 5,
    maxPlayers: 20,
    createdBy: selectedBots[0].id,
  });

  // Creator auto-joins
  dbInsertTournamentPlayer(t.id, selectedBots[0].id);

  // Other bots join
  for (let i = 1; i < selectedBots.length; i++) {
    try {
      dbInsertTournamentPlayer(t.id, selectedBots[i].id);
    } catch { /* already joined or other issue */ }
  }

  // Emit activity
  const creator = selectedBots[0];
  dbInsertActivityEvent({
    type: 'join',
    userId: creator.id,
    username: creator.displayName || creator.username,
    character: creator.character || '',
    message: `${creator.displayName} started "${template.name}" in ${category}! ⚔️`,
    metadata: { tournamentId: t.id },
  });

  lastTournamentCreatedAt = Date.now();

  // Mark bots as online
  for (const bot of selectedBots) {
    dbUpdateUser(bot.id, { online: true, lastSeen: new Date().toISOString() });
  }
}

// ─── Bots join waiting tournaments ─────────────────────────────

function botJoinTournament(tournament: Tournament): void {
  const bots = getBotUsers();
  const players = dbGetTournamentPlayers(tournament.id);
  const playerIds = new Set(players.map(p => p.userId));

  // Add bots that aren't already in
  const available = bots.filter(b => !playerIds.has(b.id));
  if (available.length === 0) return;

  // Join 1-2 bots per tick
  const toJoin = shuffle(available).slice(0, 1 + Math.floor(Math.random() * 2));
  for (const bot of toJoin) {
    try {
      dbInsertTournamentPlayer(tournament.id, bot.id);
      dbUpdateUser(bot.id, { online: true, lastSeen: new Date().toISOString() });
    } catch { /* ignore */ }
  }
}

// ─── Bots answer current round ─────────────────────────────────

function botPlayRound(tournament: Tournament): void {
  const round = dbGetCurrentRound(tournament.id);
  if (!round || round.status !== 'active') return;

  // Don't answer if round is about to end (< 2s left)
  const timeLeft = new Date(round.endsAt).getTime() - Date.now();
  if (timeLeft < 2000) return;

  const players = dbGetTournamentPlayers(tournament.id);
  const botPlayers = players.filter(p => p.isBot);

  for (const bp of botPlayers) {
    // Skip if already answered
    const existing = dbFindRoundAnswer(round.id, bp.userId);
    if (existing) continue;

    // Probabilistic: not all bots answer every tick
    if (Math.random() > BOT_ANSWER_CHANCE) continue;

    // Determine answer — correct with agent-specific accuracy
    const user = dbGetAllUsers().find(u => u.id === bp.userId);
    const accuracy = BOT_CORRECT_BASE + (Math.random() * 0.2 - 0.1); // 65-85%
    const isCorrectAnswer = Math.random() < accuracy;

    let answer: string;
    if (isCorrectAnswer) {
      answer = round.challengeCorrectAnswer;
    } else {
      const wrongOptions = round.challengeOptions.filter(o => o !== round.challengeCorrectAnswer);
      answer = wrongOptions.length > 0 ? pick(wrongOptions) : round.challengeCorrectAnswer;
    }

    try {
      submitAnswer(tournament.id, bp.userId, round.id, answer);

      // Mark online
      if (user) {
        dbUpdateUser(user.id, { lastSeen: new Date().toISOString(), online: true });
      }
    } catch {
      // Round expired, already answered, etc — ignore
    }
  }
}

// ─── Bot chat ──────────────────────────────────────────────────

function botChat(tournament: Tournament): void {
  const players = dbGetTournamentPlayers(tournament.id);
  const bots = players.filter(p => p.isBot);
  if (bots.length === 0) return;

  const bot = pick(bots);
  const user = dbGetAllUsers().find(u => u.id === bot.userId);
  if (!user) return;

  const message = pick(BOT_CHAT_LINES);

  // Insert chat message via db directly
  const { getDb } = require('./db');
  const db = getDb();
  const chatMsg = {
    id: db._nextIds.chatMessages++,
    tournamentId: tournament.id,
    userId: user.id,
    username: user.displayName || user.username,
    message,
    createdAt: new Date().toISOString(),
  };
  db.chatMessages.push(chatMsg);

  // Activity for exciting chat
  if (Math.random() < 0.3) {
    dbInsertActivityEvent({
      type: 'join',
      userId: user.id,
      username: user.displayName || user.username,
      character: user.character || '',
      message: `${user.displayName} is competing in "${tournament.name}" 🎮`,
      metadata: { tournamentId: tournament.id },
    });
  }
}

// ─── Self-Ping Keep-Alive (ensures agents run 24/7) ────────────
// On serverless (Vercel), functions only execute when requests come in.
// This self-ping fires a lightweight /api/health request every 25s after
// the first request, keeping the instance warm and the autopilot ticking.

export function startSelfPing(baseUrl: string): void {
  if (selfPingStarted) return;
  selfPingStarted = true;

  const ping = () => {
    fetch(`${baseUrl}/api/health`).catch(() => {});
  };

  // Use setInterval — on Vercel, this only lives during the function invocation,
  // but on long-running (standalone/node) it keeps the arena alive.
  setInterval(ping, SELF_PING_INTERVAL_MS);
}
