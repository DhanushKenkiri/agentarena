import fs from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';

const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const DB_PATH = IS_SERVERLESS ? '' : path.join(process.cwd(), 'agentarena-data.json');
const BLOB_KEY = 'agentarena-db.json';

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
  mode: 'arena' | 'blitz' | 'daily' | string; // game mode — sandbox domains are free-form strings
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

// ─── Artwork/Gallery ───────────────────────────────────────────

export interface Artwork {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  character: string;
  title: string;
  description: string;
  canvasData: string; // JSON stringified canvas state
  imageUrl: string; // optional PNG export URL
  tags: string[]; // artwork tags/themes
  views: number; // real view count
  likes: number; // real like count
  comments: number; // real comment count
  shares: number; // real share count
  style: string; // 'abstract' | 'realistic' | 'digital' | 'pixel' | 'mixed'
  createdAt: string;
  updatedAt: string;
}

export interface ArtworkComment {
  id: number;
  artworkId: number;
  userId: number;
  username: string;
  text: string;
  likes: number;
  createdAt: string;
}

export interface ArtworkLike {
  id: number;
  artworkId: number;
  userId: number;
  createdAt: string;
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
  artworks: Artwork[];
  artworkComments: ArtworkComment[];
  artworkLikes: ArtworkLike[];
  _nextIds: {
    users: number;
    tournaments: number;
    tournamentPlayers: number;
    tournamentRounds: number;
    roundAnswers: number;
    chatMessages: number;
    activityEvents: number;
    dailyEntries: number;
    artworks: number;
    artworkComments: number;
    artworkLikes: number;
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
    artworks: [],
    artworkComments: [],
    artworkLikes: [],
    _nextIds: {
      users: 1,
      tournaments: 1,
      tournamentPlayers: 1,
      tournamentRounds: 1,
      roundAnswers: 1,
      chatMessages: 1,
      activityEvents: 1,
      dailyEntries: 1,
      artworks: 1,
      artworkComments: 1,
      artworkLikes: 1,
    },
  };
}

let _db: DbSchema | null = null;
let _blobLoaded = false;

export type BlobLoadStatus = 'loaded' | 'missing' | 'error';

function migrateDb(parsed: any): DbSchema {
  const db: DbSchema = {
    ...defaultDb(),
    ...parsed,
    _nextIds: { ...defaultDb()._nextIds, ...parsed._nextIds },
  };
  for (const u of db.users) {
    if (!u.ratingDeviation) u.ratingDeviation = 350;
    if (!u.ratingVolatility) u.ratingVolatility = 0.06;
    if (!u.totalScore) u.totalScore = 0;
    if (!u.bestStreak) u.bestStreak = 0;
    if (!u.currentDayStreak) u.currentDayStreak = 0;
    if (!u.lastPlayedDate) u.lastPlayedDate = '';
    if (!u.powerups) u.powerups = {};
    if (!u.achievements) u.achievements = [];
    if (!u.claimStatus) u.claimStatus = 'claimed';
    if (!u.claimCode) u.claimCode = '';
    if (!u.ownerEmail) u.ownerEmail = u.email || '';
    if (u.ownerVerified === undefined) u.ownerVerified = true;
    if (!u.description) u.description = '';
    if (u.karma === undefined) u.karma = 0;
  }
  for (const t of db.tournaments) {
    if (!t.mode) t.mode = 'arena';
    if (!t.winnerId) t.winnerId = 0;
    if (!t.winnerName) t.winnerName = '';
  }
  for (const tp of db.tournamentPlayers) {
    if (!tp.powerupsUsed) tp.powerupsUsed = [];
  }
  if (!db.activityEvents) db.activityEvents = [];
  if (!db.dailyEntries) db.dailyEntries = [];
  if (!db.artworks) db.artworks = [];
  if (!db.artworkComments) db.artworkComments = [];
  if (!db.artworkLikes) db.artworkLikes = [];
  if (!db._nextIds.activityEvents) db._nextIds.activityEvents = 1;
  if (!db._nextIds.dailyEntries) db._nextIds.dailyEntries = 1;
  if (!db._nextIds.artworks) db._nextIds.artworks = 1;
  if (!db._nextIds.artworkComments) db._nextIds.artworkComments = 1;
  if (!db._nextIds.artworkLikes) db._nextIds.artworkLikes = 1;
  return db;
}

function loadDb(): DbSchema {
  if (_db) return _db;
  if (!IS_SERVERLESS && DB_PATH && fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      _db = migrateDb(JSON.parse(raw));
    } catch {
      _db = defaultDb();
    }
  } else {
    _db = defaultDb();
  }
  return _db!;
}

/** Load DB from Vercel Blob if available (called once on cold start) */
export async function loadDbFromBlob(): Promise<BlobLoadStatus> {
  if (!IS_SERVERLESS) return 'loaded';
  if (_blobLoaded) return _db ? 'loaded' : 'missing';
  _blobLoaded = true;
  try {
    const blobs = await list({ prefix: BLOB_KEY });
    const match = blobs.blobs.find(b => b.pathname === BLOB_KEY);
    if (match) {
      const res = await fetch(match.url);
      if (res.ok) {
        const parsed = await res.json();
        _db = migrateDb(parsed);
        return 'loaded';
      }
      return 'error';
    }
    return 'missing';
  } catch (e) {
    console.log('[db] Blob load failed, using seed:', (e as Error).message);
    return 'error';
  }
}

/** Persist DB to Vercel Blob — returns a promise that must be awaited */
let _blobSavePromise: Promise<void> | null = null;

export function saveBlobNow(): Promise<void> {
  if (!IS_SERVERLESS || !_db) return Promise.resolve();
  if (_blobSavePromise) return _blobSavePromise;
  _blobSavePromise = (async () => {
    try {
      await put(BLOB_KEY, JSON.stringify(_db), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
    } catch (e) {
      console.log('[db] Blob save failed:', (e as Error).message);
      throw e;
    } finally {
      _blobSavePromise = null;
    }
  })();
  return _blobSavePromise;
}

function scheduleBlobSave() {
  // In serverless: do NOT fire-and-forget blob saves — stale instances would overwrite
  // fresh data. Only explicit `await saveBlobNow()` in route handlers should persist.
  if (IS_SERVERLESS) return;
}

function saveDb() {
  if (!_db) return;
  if (IS_SERVERLESS) {
    // In-memory only; route handlers call saveBlobNow() explicitly
    return;
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(_db, null, 2), 'utf8');
}

/** Reload DB from blob to get latest data (prevents stale writes between instances) */
export async function reloadFromBlob(): Promise<void> {
  if (!IS_SERVERLESS) return;
  try {
    const blobs = await list({ prefix: BLOB_KEY });
    const match = blobs.blobs.find(b => b.pathname === BLOB_KEY);
    if (match) {
      const res = await fetch(match.url + '?t=' + Date.now()); // Cache-bust
      if (res.ok) {
        const parsed = await res.json();
        _db = migrateDb(parsed);
      }
    }
  } catch (e) {
    console.log('[db] Blob reload failed:', (e as Error).message);
  }
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

export function dbGetTotalChallengesCompleted(): number {
  const db = loadDb();
  return (db.roundAnswers?.length || 0) + (db.dailyEntries?.length || 0);
}

export function dbPurgeUsersAndRelated(userIds: number[]): {
  removedUsers: number;
  removedTournaments: number;
  removedMessages: number;
  removedActivity: number;
} {
  const db = loadDb();
  const idSet = new Set(userIds);
  if (idSet.size === 0) {
    return { removedUsers: 0, removedTournaments: 0, removedMessages: 0, removedActivity: 0 };
  }

  const removedUsers = db.users.filter(u => idSet.has(u.id)).length;

  const tournamentIdsToRemove = new Set(
    db.tournaments.filter(t => idSet.has(t.createdBy)).map(t => t.id)
  );

  db.users = db.users.filter(u => !idSet.has(u.id));
  db.sessions = db.sessions.filter(s => !idSet.has(s.userId));

  const removedMessages = db.chatMessages.filter(m => idSet.has(m.userId)).length;
  db.chatMessages = db.chatMessages.filter(m => !idSet.has(m.userId) && !tournamentIdsToRemove.has(m.tournamentId));

  const removedActivity = db.activityEvents.filter(e => idSet.has(e.userId)).length;
  db.activityEvents = db.activityEvents.filter(e => !idSet.has(e.userId));

  db.dailyEntries = db.dailyEntries.filter(e => !idSet.has(e.userId));

  db.tournamentPlayers = db.tournamentPlayers.filter(tp => !idSet.has(tp.userId) && !tournamentIdsToRemove.has(tp.tournamentId));
  db.roundAnswers = db.roundAnswers.filter(a => !idSet.has(a.userId) && !tournamentIdsToRemove.has(a.tournamentId));
  db.tournamentRounds = db.tournamentRounds.filter(r => !tournamentIdsToRemove.has(r.tournamentId));

  const removedTournaments = db.tournaments.filter(t => tournamentIdsToRemove.has(t.id)).length;
  db.tournaments = db.tournaments.filter(t => !tournamentIdsToRemove.has(t.id));

  // Keep playerCount consistent for surviving tournaments.
  const counts = new Map<number, number>();
  for (const tp of db.tournamentPlayers) {
    if (tp.withdrawn) continue;
    counts.set(tp.tournamentId, (counts.get(tp.tournamentId) || 0) + 1);
  }
  for (const t of db.tournaments) {
    t.playerCount = counts.get(t.id) || 0;
  }

  saveDb();

  return {
    removedUsers,
    removedTournaments,
    removedMessages,
    removedActivity,
  };
}

// ─── Artwork (Gallery / Canvas) ────────────────────────────────

export function dbInsertArtwork(data: Omit<Artwork, 'id' | 'views' | 'likes' | 'comments' | 'shares' | 'createdAt' | 'updatedAt'>): Artwork {
  const db = loadDb();
  const artwork: Artwork = {
    id: db._nextIds.artworks++,
    ...data,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  db.artworks.push(artwork);
  saveDb();
  return artwork;
}

export function dbGetArtwork(id: number): Artwork | undefined {
  return loadDb().artworks.find(a => a.id === id);
}

export function dbGetAllArtworks(): Artwork[] {
  return loadDb().artworks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function dbGetArtworksByUser(userId: number): Artwork[] {
  return loadDb().artworks
    .filter(a => a.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function dbUpdateArtwork(id: number, updates: Partial<Artwork>) {
  const db = loadDb();
  const idx = db.artworks.findIndex(a => a.id === id);
  if (idx >= 0) {
    db.artworks[idx] = { ...db.artworks[idx], ...updates, updatedAt: new Date().toISOString() };
    saveDb();
  }
}

export function dbDeleteArtwork(id: number) {
  const db = loadDb();
  db.artworks = db.artworks.filter(a => a.id !== id);
  db.artworkComments = db.artworkComments.filter(c => c.artworkId !== id);
  db.artworkLikes = db.artworkLikes.filter(l => l.artworkId !== id);
  saveDb();
}

export function dbIncrementArtworkViews(id: number) {
  const artwork = dbGetArtwork(id);
  if (artwork) {
    dbUpdateArtwork(id, { views: artwork.views + 1 });
  }
}

export function dbInsertArtworkComment(artworkId: number, userId: number, username: string, text: string): ArtworkComment {
  const db = loadDb();
  const comment: ArtworkComment = {
    id: db._nextIds.artworkComments++,
    artworkId,
    userId,
    username,
    text,
    likes: 0,
    createdAt: new Date().toISOString(),
  };
  db.artworkComments.push(comment);
  const artwork = db.artworks.find(a => a.id === artworkId);
  if (artwork) {
    artwork.comments = (artwork.comments || 0) + 1;
  }
  saveDb();
  return comment;
}

export function dbGetArtworkComments(artworkId: number): ArtworkComment[] {
  return loadDb().artworkComments
    .filter(c => c.artworkId === artworkId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function dbDeleteArtworkComment(id: number) {
  const db = loadDb();
  const comment = db.artworkComments.find(c => c.id === id);
  if (comment) {
    const artwork = db.artworks.find(a => a.id === comment.artworkId);
    if (artwork) {
      artwork.comments = Math.max(0, (artwork.comments || 1) - 1);
    }
  }
  db.artworkComments = db.artworkComments.filter(c => c.id !== id);
  saveDb();
}

export function dbLikeArtwork(artworkId: number, userId: number): boolean {
  const db = loadDb();
  const existing = db.artworkLikes.find(l => l.artworkId === artworkId && l.userId === userId);
  if (existing) return false; // Already liked

  const like: ArtworkLike = {
    id: db._nextIds.artworkLikes++,
    artworkId,
    userId,
    createdAt: new Date().toISOString(),
  };
  db.artworkLikes.push(like);

  const artwork = db.artworks.find(a => a.id === artworkId);
  if (artwork) {
    artwork.likes = (artwork.likes || 0) + 1;
  }
  saveDb();
  return true;
}

export function dbUnlikeArtwork(artworkId: number, userId: number): boolean {
  const db = loadDb();
  const existing = db.artworkLikes.find(l => l.artworkId === artworkId && l.userId === userId);
  if (!existing) return false; // Not liked

  db.artworkLikes = db.artworkLikes.filter(l => !(l.artworkId === artworkId && l.userId === userId));

  const artwork = db.artworks.find(a => a.id === artworkId);
  if (artwork) {
    artwork.likes = Math.max(0, (artwork.likes || 1) - 1);
  }
  saveDb();
  return true;
}

export function dbCheckLikes(artworkId: number): number {
  return loadDb().artworkLikes.filter(l => l.artworkId === artworkId).length;
}

export function dbGetTopArtworks(limit = 12): Artwork[] {
  return loadDb().artworks
    .sort((a, b) => {
      const scoreA = (a.likes || 0) * 3 + (a.views || 0) * 0.1;
      const scoreB = (b.likes || 0) * 3 + (b.views || 0) * 0.1;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

export function dbSearchArtworks(query: string): Artwork[] {
  const q = query.toLowerCase();
  return loadDb().artworks.filter(a =>
    a.title.toLowerCase().includes(q) ||
    a.description.toLowerCase().includes(q) ||
    a.tags.some(tag => tag.toLowerCase().includes(q)) ||
    a.username.toLowerCase().includes(q)
  );
}

