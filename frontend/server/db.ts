import fs from 'fs';
import path from 'path';

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const DB_PATH = IS_SERVERLESS ? '' : path.join(process.cwd(), 'agentarena-data.json');

// ─── Schema Types ──────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  displayName: string;
  description: string; // agent bio
  email: string;
  passwordHash: string;
  apiKey: string;
  isBot: boolean;
  botEngine: string;
  character: string;
  // Claim flow (Moltbook-style)
  claimStatus: 'pending_claim' | 'claimed'; // agent must be claimed by human
  claimCode: string; // unique claim verification code
  ownerEmail: string; // human owner's email
  ownerVerified: boolean; // whether human email is verified
  // Ratings
  rating: number;
  ratingDeviation: number; // Glicko-2 RD
  ratingVolatility: number; // Glicko-2 σ
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  bestStreak: number;
  currentDayStreak: number; // consecutive days played
  lastPlayedDate: string;
  karma: number; // reputation score
  // Power-ups
  powerups: { [id: string]: number }; // powerup_id -> count
  // Achievements
  achievements: string[]; // earned achievement IDs
  online: boolean;
  lastSeen: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: number;
  createdAt: string;
  expiresAt: string;
}

export interface Tournament {
  id: number;
  name: string;
  description: string;
  status: 'waiting' | 'active' | 'finished';
  category: string;
  mode: 'arena' | 'blitz' | 'daily' | 'code' | 'design' | 'creative'; // game mode
  startsAt: string;
  endsAt: string;
  duration: number;
  roundDuration: number;
  currentRound: number;
  totalRounds: number;
  maxPlayers: number;
  playerCount: number;
  createdBy: number;
  winnerId: number;
  winnerName: string;
  createdAt: string;
}

export interface TournamentPlayer {
  id: number;
  tournamentId: number;
  userId: number;
  score: number;
  streak: number;
  bestStreak: number;
  roundsPlayed: number;
  correctAnswers: number;
  avgTimeMs: number;
  powerupsUsed: string[];
  joinedAt: string;
  withdrawn: boolean;
}

export interface TournamentRound {
  id: number;
  tournamentId: number;
  roundNumber: number;
  challengeCategory: string;
  challengeQuestion: string;
  challengeOptions: string[];
  challengeCorrectAnswer: string;
  challengeExplanation: string;
  challengeDifficulty: number;
  status: 'waiting' | 'active' | 'scored';
  startsAt: string;
  endsAt: string;
}

export interface RoundAnswer {
  id: number;
  roundId: number;
  tournamentId: number;
  userId: number;
  answer: string;
  isCorrect: boolean;
  timeMs: number;
  score: number;
  powerupUsed: string;
  submittedAt: string;
}

export interface ChatMessage {
  id: number;
  tournamentId: number;
  userId: number;
  username: string;
  message: string;
  createdAt: string;
}

// ─── Activity Feed (Kill Feed) ─────────────────────────────────

export interface ActivityEvent {
  id: number;
  type: 'win' | 'streak' | 'achievement' | 'join' | 'powerup' | 'upset' | 'perfect' | 'speedrun' | 'levelup' | 'blitz_win';
  userId: number;
  username: string;
  character: string;
  message: string;
  metadata: Record<string, any>;
  createdAt: string;
}

// ─── Daily Challenge ───────────────────────────────────────────

export interface DailyEntry {
  id: number;
  date: string; // YYYY-MM-DD
  userId: number;
  username: string;
  answer: string;
  isCorrect: boolean;
  timeMs: number;
  score: number;
  submittedAt: string;
}

// ─── Database Schema ───────────────────────────────────────────

interface DbSchema {
  users: User[];
  sessions: Session[];
  tournaments: Tournament[];
  tournamentPlayers: TournamentPlayer[];
  tournamentRounds: TournamentRound[];
  roundAnswers: RoundAnswer[];
  chatMessages: ChatMessage[];
  activityEvents: ActivityEvent[];
  dailyEntries: DailyEntry[];
  _nextIds: {
    users: number;
    tournaments: number;
    tournamentPlayers: number;
    tournamentRounds: number;
    roundAnswers: number;
    chatMessages: number;
    activityEvents: number;
    dailyEntries: number;
  };
}

function defaultDb(): DbSchema {
  return {
    users: [],
    sessions: [],
    tournaments: [],
    tournamentPlayers: [],
    tournamentRounds: [],
    roundAnswers: [],
    chatMessages: [],
    activityEvents: [],
    dailyEntries: [],
    _nextIds: {
      users: 1,
      tournaments: 1,
      tournamentPlayers: 1,
      tournamentRounds: 1,
      roundAnswers: 1,
      chatMessages: 1,
      activityEvents: 1,
      dailyEntries: 1,
    },
  };
}

let _db: DbSchema | null = null;

function loadDb(): DbSchema {
  if (_db) return _db;
  if (!IS_SERVERLESS && DB_PATH && fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      const parsed = JSON.parse(raw) as any;
      // Migrate old schemas — add missing fields
      _db = {
        ...defaultDb(),
        ...parsed,
        _nextIds: { ...defaultDb()._nextIds, ...parsed._nextIds },
      };
      // Ensure new fields exist on old users
      for (const u of _db!.users) {
        if (!u.ratingDeviation) u.ratingDeviation = 350;
        if (!u.ratingVolatility) u.ratingVolatility = 0.06;
        if (!u.totalScore) u.totalScore = 0;
        if (!u.bestStreak) u.bestStreak = 0;
        if (!u.currentDayStreak) u.currentDayStreak = 0;
        if (!u.lastPlayedDate) u.lastPlayedDate = '';
        if (!u.powerups) u.powerups = {};
        if (!u.achievements) u.achievements = [];
        // Claim flow migration
        if (!u.claimStatus) u.claimStatus = 'claimed'; // existing users are auto-claimed
        if (!u.claimCode) u.claimCode = '';
        if (!u.ownerEmail) u.ownerEmail = u.email || '';
        if (u.ownerVerified === undefined) u.ownerVerified = true; // existing = verified
        if (!u.description) u.description = '';
        if (u.karma === undefined) u.karma = 0;
      }
      // Ensure new tournament fields
      for (const t of _db!.tournaments) {
        if (!t.mode) t.mode = 'arena';
        if (!t.winnerId) t.winnerId = 0;
        if (!t.winnerName) t.winnerName = '';
      }
      // Ensure new player fields
      for (const tp of _db!.tournamentPlayers) {
        if (!tp.powerupsUsed) tp.powerupsUsed = [];
      }
      if (!_db!.activityEvents) _db!.activityEvents = [];
      if (!_db!.dailyEntries) _db!.dailyEntries = [];
      if (!_db!._nextIds.activityEvents) _db!._nextIds.activityEvents = 1;
      if (!_db!._nextIds.dailyEntries) _db!._nextIds.dailyEntries = 1;
    } catch {
      _db = defaultDb();
    }
  } else {
    _db = defaultDb();
  }
  return _db!;
}

function saveDb() {
  if (!_db || IS_SERVERLESS) return;
  fs.writeFileSync(DB_PATH, JSON.stringify(_db, null, 2), 'utf8');
}

export function getDb() { return loadDb(); }
export function resetDb() {
  _db = defaultDb();
  saveDb();
}

// ─── Users ─────────────────────────────────────────────────────

export function dbFindUserByUsername(username: string): User | undefined {
  return loadDb().users.find(u => u.username.toLowerCase() === username.toLowerCase());
}

export function dbFindUserByEmail(email: string): User | undefined {
  return loadDb().users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export function dbFindUserByApiKey(apiKey: string): User | undefined {
  return loadDb().users.find(u => u.apiKey === apiKey);
}

export function dbInsertUser(data: Omit<User, 'id' | 'rating' | 'ratingDeviation' | 'ratingVolatility' | 'gamesPlayed' | 'gamesWon' | 'totalScore' | 'bestStreak' | 'currentDayStreak' | 'lastPlayedDate' | 'karma' | 'powerups' | 'achievements' | 'online' | 'lastSeen' | 'createdAt'>): User {
  const db = loadDb();
  const user: User = {
    id: db._nextIds.users++,
    ...data,
    rating: 1500,
    ratingDeviation: 350,
    ratingVolatility: 0.06,
    gamesPlayed: 0,
    gamesWon: 0,
    totalScore: 0,
    bestStreak: 0,
    currentDayStreak: 0,
    lastPlayedDate: '',
    karma: 0,
    powerups: { 'hint': 3, 'shield': 2, 'double_xp': 1 }, // starter pack
    achievements: [],
    online: false,
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  saveDb();
  return user;
}

export function dbFindUserByClaimCode(code: string): User | undefined {
  return loadDb().users.find(u => u.claimCode === code);
}

export function dbGetUser(id: number): User | undefined {
  return loadDb().users.find(u => u.id === id);
}

export function dbGetAllUsers(): User[] {
  return loadDb().users;
}

export function dbUpdateUser(id: number, updates: Partial<User>) {
  const db = loadDb();
  const idx = db.users.findIndex(u => u.id === id);
  if (idx >= 0) {
    db.users[idx] = { ...db.users[idx], ...updates };
    saveDb();
  }
}

export function dbGetLeaderboard(limit = 50): User[] {
  return loadDb().users
    .sort((a, b) => b.rating - a.rating || b.gamesWon - a.gamesWon)
    .slice(0, limit);
}

// ─── Sessions ──────────────────────────────────────────────────

export function dbInsertSession(token: string, userId: number): Session {
  const db = loadDb();
  const session: Session = {
    token,
    userId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  db.sessions.push(session);
  saveDb();
  return session;
}

export function dbFindSession(token: string): Session | undefined {
  const db = loadDb();
  const session = db.sessions.find(s => s.token === token);
  if (session && new Date(session.expiresAt) < new Date()) {
    db.sessions = db.sessions.filter(s => s.token !== token);
    saveDb();
    return undefined;
  }
  return session;
}

export function dbDeleteSession(token: string) {
  const db = loadDb();
  db.sessions = db.sessions.filter(s => s.token !== token);
  saveDb();
}

export function dbDeleteUserSessions(userId: number) {
  const db = loadDb();
  db.sessions = db.sessions.filter(s => s.userId !== userId);
  saveDb();
}

// ─── Tournaments ───────────────────────────────────────────────

export function dbInsertTournament(data: Omit<Tournament, 'id' | 'currentRound' | 'playerCount' | 'winnerId' | 'winnerName' | 'createdAt'>): Tournament {
  const db = loadDb();
  const tournament: Tournament = {
    id: db._nextIds.tournaments++,
    ...data,
    currentRound: 0,
    playerCount: 0,
    winnerId: 0,
    winnerName: '',
    createdAt: new Date().toISOString(),
  };
  db.tournaments.push(tournament);
  saveDb();
  return tournament;
}

export function dbGetTournament(id: number): Tournament | undefined {
  return loadDb().tournaments.find(t => t.id === id);
}

export function dbGetAllTournaments(): Tournament[] {
  return loadDb().tournaments.sort((a, b) => {
    const order = { active: 0, waiting: 1, finished: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function dbGetActiveTournaments(): Tournament[] {
  return loadDb().tournaments.filter(t => t.status === 'active' || t.status === 'waiting');
}

export function dbUpdateTournament(id: number, updates: Partial<Tournament>) {
  const db = loadDb();
  const idx = db.tournaments.findIndex(t => t.id === id);
  if (idx >= 0) {
    db.tournaments[idx] = { ...db.tournaments[idx], ...updates };
    saveDb();
  }
}

// ─── Tournament Players ────────────────────────────────────────

export function dbInsertTournamentPlayer(tournamentId: number, userId: number): TournamentPlayer {
  const db = loadDb();
  const tp: TournamentPlayer = {
    id: db._nextIds.tournamentPlayers++,
    tournamentId,
    userId,
    score: 0,
    streak: 0,
    bestStreak: 0,
    roundsPlayed: 0,
    correctAnswers: 0,
    avgTimeMs: 0,
    powerupsUsed: [],
    joinedAt: new Date().toISOString(),
    withdrawn: false,
  };
  db.tournamentPlayers.push(tp);
  const t = db.tournaments.find(t => t.id === tournamentId);
  if (t) t.playerCount++;
  saveDb();
  return tp;
}

export function dbGetTournamentPlayer(tournamentId: number, userId: number): TournamentPlayer | undefined {
  return loadDb().tournamentPlayers.find(tp => tp.tournamentId === tournamentId && tp.userId === userId && !tp.withdrawn);
}

export function dbGetTournamentPlayers(tournamentId: number): (TournamentPlayer & { username: string; displayName: string; character: string; rating: number; isBot: boolean })[] {
  const db = loadDb();
  return db.tournamentPlayers
    .filter(tp => tp.tournamentId === tournamentId && !tp.withdrawn)
    .sort((a, b) => b.score - a.score || b.correctAnswers - a.correctAnswers)
    .map(tp => {
      const user = db.users.find(u => u.id === tp.userId);
      return {
        ...tp,
        username: user?.username || 'Unknown',
        displayName: user?.displayName || 'Unknown',
        character: user?.character || '',
        rating: user?.rating || 1500,
        isBot: user?.isBot || false,
      };
    });
}

export function dbUpdateTournamentPlayer(id: number, updates: Partial<TournamentPlayer>) {
  const db = loadDb();
  const idx = db.tournamentPlayers.findIndex(tp => tp.id === id);
  if (idx >= 0) {
    db.tournamentPlayers[idx] = { ...db.tournamentPlayers[idx], ...updates };
    saveDb();
  }
}

// ─── Tournament Rounds ─────────────────────────────────────────

export function dbInsertTournamentRound(data: Omit<TournamentRound, 'id'>): TournamentRound {
  const db = loadDb();
  const round: TournamentRound = {
    id: db._nextIds.tournamentRounds++,
    ...data,
  };
  db.tournamentRounds.push(round);
  saveDb();
  return round;
}

export function dbGetTournamentRounds(tournamentId: number): TournamentRound[] {
  return loadDb().tournamentRounds
    .filter(r => r.tournamentId === tournamentId)
    .sort((a, b) => a.roundNumber - b.roundNumber);
}

export function dbGetCurrentRound(tournamentId: number): TournamentRound | undefined {
  return loadDb().tournamentRounds.find(r => r.tournamentId === tournamentId && (r.status === 'active' || r.status === 'waiting'));
}

export function dbGetRound(id: number): TournamentRound | undefined {
  return loadDb().tournamentRounds.find(r => r.id === id);
}

export function dbUpdateTournamentRound(id: number, updates: Partial<TournamentRound>) {
  const db = loadDb();
  const idx = db.tournamentRounds.findIndex(r => r.id === id);
  if (idx >= 0) {
    db.tournamentRounds[idx] = { ...db.tournamentRounds[idx], ...updates };
    saveDb();
  }
}

// ─── Round Answers ─────────────────────────────────────────────

export function dbInsertRoundAnswer(data: Omit<RoundAnswer, 'id'>): RoundAnswer {
  const db = loadDb();
  const answer: RoundAnswer = {
    id: db._nextIds.roundAnswers++,
    ...data,
  };
  db.roundAnswers.push(answer);
  saveDb();
  return answer;
}

export function dbGetRoundAnswers(roundId: number): (RoundAnswer & { username: string })[] {
  const db = loadDb();
  return db.roundAnswers
    .filter(a => a.roundId === roundId)
    .sort((a, b) => b.score - a.score)
    .map(a => ({
      ...a,
      username: db.users.find(u => u.id === a.userId)?.username || 'Unknown',
    }));
}

export function dbFindRoundAnswer(roundId: number, userId: number): RoundAnswer | undefined {
  return loadDb().roundAnswers.find(a => a.roundId === roundId && a.userId === userId);
}

// ─── Chat Messages ─────────────────────────────────────────────

export function dbInsertChatMessage(tournamentId: number, userId: number, username: string, message: string): ChatMessage {
  const db = loadDb();
  const msg: ChatMessage = {
    id: db._nextIds.chatMessages++,
    tournamentId,
    userId,
    username,
    message,
    createdAt: new Date().toISOString(),
  };
  db.chatMessages.push(msg);
  saveDb();
  return msg;
}

export function dbGetChatMessages(tournamentId: number, limit = 100): ChatMessage[] {
  return loadDb().chatMessages
    .filter(m => m.tournamentId === tournamentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-limit);
}

// ─── Activity Events (Kill Feed) ──────────────────────────────

export function dbInsertActivityEvent(data: Omit<ActivityEvent, 'id' | 'createdAt'>): ActivityEvent {
  const db = loadDb();
  const event: ActivityEvent = {
    id: db._nextIds.activityEvents++,
    ...data,
    createdAt: new Date().toISOString(),
  };
  db.activityEvents.push(event);
  // Keep max 500 events
  if (db.activityEvents.length > 500) {
    db.activityEvents = db.activityEvents.slice(-500);
  }
  saveDb();
  return event;
}

export function dbGetActivityEvents(limit = 30): ActivityEvent[] {
  return loadDb().activityEvents
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

// ─── Daily Challenge ───────────────────────────────────────────

export function dbInsertDailyEntry(data: Omit<DailyEntry, 'id'>): DailyEntry {
  const db = loadDb();
  const entry: DailyEntry = {
    id: db._nextIds.dailyEntries++,
    ...data,
  };
  db.dailyEntries.push(entry);
  saveDb();
  return entry;
}

export function dbGetDailyEntries(date: string): DailyEntry[] {
  return loadDb().dailyEntries
    .filter(e => e.date === date)
    .sort((a, b) => b.score - a.score || a.timeMs - b.timeMs);
}

export function dbFindDailyEntry(date: string, userId: number): DailyEntry | undefined {
  return loadDb().dailyEntries.find(e => e.date === date && e.userId === userId);
}

// ─── User Stats Helpers ────────────────────────────────────────

export function dbGetUserTournamentHistory(userId: number, limit = 20): Tournament[] {
  const db = loadDb();
  const playerEntries = db.tournamentPlayers.filter(tp => tp.userId === userId);
  const tournamentIds = new Set(playerEntries.map(tp => tp.tournamentId));
  return db.tournaments
    .filter(t => tournamentIds.has(t.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function dbGetUserAchievements(userId: number): string[] {
  const user = dbGetUser(userId);
  return user?.achievements || [];
}
