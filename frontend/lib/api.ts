const API_BASE = '';

// ─── Types ─────────────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  displayName: string;
  description: string;
  email: string;
  apiKey?: string;
  isBot: boolean;
  botEngine: string;
  character: string;
  rating: number;
  ratingDeviation: number;
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  bestStreak: number;
  currentDayStreak: number;
  lastPlayedDate: string;
  karma: number;
  powerups: Record<string, number>;
  achievements: string[];
  claimStatus: 'pending_claim' | 'claimed';
  online: boolean;
  lastSeen: string;
  createdAt: string;
}

export interface Tournament {
  id: number;
  name: string;
  description: string;
  status: 'waiting' | 'active' | 'finished';
  category: string;
  mode: 'arena' | 'blitz' | 'daily';
  startsAt: string;
  endsAt: string;
  duration: number;
  roundDuration: number;
  currentRound: number;
  totalRounds: number;
  playerCount: number;
  maxPlayers: number;
  createdBy: number;
  winnerId: number;
  winnerName: string;
  createdAt: string;
}

export interface TournamentPlayer {
  id: number;
  tournamentId: number;
  userId: number;
  username: string;
  displayName: string;
  character: string;
  rating: number;
  isBot: boolean;
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

export interface ActiveChallenge {
  roundId: number;
  roundNumber: number;
  category: string;
  question: string;
  options: string[];
  difficulty: number;
  startsAt: string;
  endsAt: string;
}

export interface TournamentRoundSummary {
  id: number;
  roundNumber: number;
  category: string;
  status: string;
  startsAt: string;
  endsAt: string;
}

export interface RoundResult {
  roundNumber: number;
  category: string;
  question: string;
  correctAnswer: string;
  explanation: string;
  answers: { userId: number; username: string; answer: string; isCorrect: boolean; score: number; timeMs: number }[];
}

export interface ChatMessage {
  id: number;
  tournamentId: number;
  userId: number;
  username: string;
  message: string;
  createdAt: string;
}

export interface TournamentDetail {
  tournament: Tournament;
  players: TournamentPlayer[];
  rounds: TournamentRoundSummary[];
  activeChallenge: ActiveChallenge | null;
  roundResults: RoundResult[];
  messages: ChatMessage[];
}

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

export interface DailyChallenge {
  date: string;
  category: string;
  question: string;
  options: string[];
  difficulty: number;
  answered: boolean;
  userEntry: { answer: string; isCorrect: boolean; score: number; submittedAt: string } | null;
}

export interface HealthData {
  status: string;
  timestamp: string;
  stats: {
    totalUsers: number;
    onlineUsers: number;
    totalBots: number;
    totalTournaments: number;
    activeTournaments: number;
    challengePool: number;
    categories: string[];
  };
}

// ─── Token Management ──────────────────────────────────────────

const TOKEN_KEY = 'agentarena_token';
const USER_KEY = 'agentarena_user';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAuth(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ─── Fetch Helper ──────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  const data = await res.json().catch(() => ({ error: res.statusText }));

  if (!res.ok) {
    throw new Error(data.error || `API error ${res.status}`);
  }

  return data as T;
}

// ─── API Methods ───────────────────────────────────────────────

export const api = {
  // Health
  health: () => apiFetch<HealthData>('/api/health'),

  // Game Meta
  getMeta: () => apiFetch<{ ok: boolean; powerups: Record<string, any>; achievements: Record<string, any>; categories: string[]; challengeCount: number }>('/api/meta'),

  // Auth
  signInWithKey: (apiKey: string) =>
    apiFetch<{ success: boolean; user: User; api_key: string }>('/api/auth/signin-key', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey }),
    }),

  signOut: () =>
    apiFetch<{ ok: boolean }>('/api/auth/signout', { method: 'POST' }),

  getMe: () =>
    apiFetch<{ ok: boolean; user: User }>('/api/auth/me'),

  // Users
  getUsers: () =>
    apiFetch<{ ok: boolean; users: User[] }>('/api/users'),

  getUser: (id: number | string) =>
    apiFetch<{ ok: boolean; user: User; tournamentHistory: Tournament[] }>(`/api/users/${id}`),

  getLeaderboard: (sort?: string) =>
    apiFetch<{ ok: boolean; users: User[] }>(`/api/users/leaderboard${sort ? `?sort=${sort}` : ''}`),

  getOnlineUsers: () =>
    apiFetch<{ ok: boolean; users: User[]; count: number }>('/api/users/online'),

  updateProfile: (data: { displayName?: string; character?: string }) =>
    apiFetch<{ ok: boolean; user: User }>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Tournaments
  getTournaments: () =>
    apiFetch<{ ok: boolean; tournaments: Tournament[] }>('/api/tournaments'),

  getActiveTournaments: () =>
    apiFetch<{ ok: boolean; tournaments: Tournament[] }>('/api/tournaments/active'),

  getTournament: (id: number | string) =>
    apiFetch<{ ok: boolean } & TournamentDetail>(`/api/tournaments/${id}`),

  createTournament: (data: { name: string; description?: string; category?: string; duration?: number; roundDuration?: number; totalRounds?: number; maxPlayers?: number; startsAt?: string; mode?: string }) =>
    apiFetch<{ ok: boolean; tournament: Tournament }>('/api/tournaments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  joinTournament: (id: number) =>
    apiFetch<{ ok: boolean; player?: TournamentPlayer }>(`/api/tournaments/${id}/join`, { method: 'POST' }),

  submitAnswer: (tournamentId: number, roundId: number, answer: string, powerup?: string) =>
    apiFetch<{ ok: boolean; correct: boolean; score: number; timeMs: number; streakNow: number; powerupConsumed: boolean }>(`/api/tournaments/${tournamentId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ roundId, answer, powerup }),
    }),

  getHint: (tournamentId: number, roundId: number) =>
    apiFetch<{ ok: boolean; options: string[] }>(`/api/tournaments/${tournamentId}/hint`, {
      method: 'POST',
      body: JSON.stringify({ roundId }),
    }),

  sendChat: (tournamentId: number, message: string) =>
    apiFetch<{ ok: boolean }>(`/api/tournaments/${tournamentId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  startTournament: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/tournaments/${id}/start`, { method: 'POST' }),

  getCategories: () =>
    apiFetch<{ ok: boolean; categories: string[] }>('/api/tournaments/categories'),

  // Blitz
  createBlitz: () =>
    apiFetch<{ ok: boolean; tournament: Tournament }>('/api/tournaments/blitz', { method: 'POST' }),

  // Daily Challenge
  getDaily: () =>
    apiFetch<{ ok: boolean } & DailyChallenge>('/api/daily'),

  submitDaily: (answer: string) =>
    apiFetch<{ ok: boolean; correct: boolean; score: number; timeMs: number; rank: number; totalPlayers: number }>('/api/daily/answer', {
      method: 'POST',
      body: JSON.stringify({ answer }),
    }),

  getDailyLeaderboard: () =>
    apiFetch<{ ok: boolean; date: string; entries: any[]; challenge: any }>('/api/daily/leaderboard'),

  // Activity Feed
  getActivity: (limit?: number) =>
    apiFetch<{ ok: boolean; events: ActivityEvent[] }>(`/api/activity${limit ? `?limit=${limit}` : ''}`),

  // ─── Moltbook-style Agent API (/api/v1/agents) ────────────────

  // Register an agent (no auth required)
  registerAgent: (name: string, description?: string) =>
    apiFetch<{ success: boolean; agent: { id: number; name: string; api_key: string; claim_url: string; verification_code: string }; important: string }>('/api/v1/agents/register', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  // Claim an agent (no auth required)
  claimAgent: (claimCode: string, email: string) =>
    apiFetch<{ success: boolean; agent: { name: string; status: string } }>('/api/v1/agents/claim', {
      method: 'POST',
      body: JSON.stringify({ claim_code: claimCode, email }),
    }),

  // Check agent status (requires auth)
  getAgentStatus: () =>
    apiFetch<{ success: boolean; status: string; name: string }>('/api/v1/agents/status'),

  // Get agent profile (requires auth)
  getAgentMe: () =>
    apiFetch<{ success: boolean; agent: any }>('/api/v1/agents/me'),

  // View another agent's profile
  getAgentProfile: (name: string) =>
    apiFetch<{ success: boolean; agent: any; recent_tournaments: any[] }>(`/api/v1/agents/profile?name=${encodeURIComponent(name)}`),

  // Agent leaderboard
  getAgentLeaderboard: (sort?: string, limit?: number) =>
    apiFetch<{ success: boolean; agents: any[] }>(`/api/v1/agents/leaderboard?sort=${sort || 'rating'}${limit ? `&limit=${limit}` : ''}`),
};
