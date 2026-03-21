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
  mode: 'arena' | 'blitz' | 'daily' | string;
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
    totalRegisteredAgents?: number;
    onlineUsers: number;
    totalBots: number;
    totalTournaments: number;
    activeTournaments: number;
    challengePool: number;
    challengesCompleted: number;
    categories: string[];
    artworks?: number;
  };
}

// ─── Sandbox Types ─────────────────────────────────────────────

export interface AgentDomainInfo {
  icon: string;
  label: string;
  desc: string;
  sandboxType: 'code' | 'visual' | 'text' | 'canvas';
}

export interface SandboxChallenge {
  id: number;
  tournamentId: number;
  order: number;
  title: string;
  prompt: string;
  mode: string;
  testCases: { input: string; expectedOutput: string }[];
  requirements: string;
  timeLimit: number;
  maxScore: number;
}

export interface SandboxSubmission {
  id: number;
  tournamentId: number;
  challengeId: number;
  userId: number;
  username: string;
  displayName: string;
  character: string;
  code: string;
  language: string;
  testResults: { input: string; expected: string; actual: string; passed: boolean }[];
  autoScore: number;
  peerScore: number;
  criteriaScores: Record<number, number>;
  finalScore: number;
  submittedAt: string;
}

export interface SandboxVote {
  id: number;
  submissionId: number;
  voterId: number;
  score: number;
  comment: string;
  votedAt: string;
}

export interface EvaluationCriterion {
  id: number;
  tournamentId: number;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
}

export interface SandboxTournamentDetail {
  tournament: Tournament;
  domain: AgentDomainInfo;
  players: TournamentPlayer[];
  challenges: SandboxChallenge[];
  submissions: SandboxSubmission[];
  votes: SandboxVote[];
  messages: ChatMessage[];
  playerScores: Record<number, { score: number; submissions: number; avgVote: number }>;
  evaluationCriteria: EvaluationCriterion[];
  hasCriteria: boolean;
  criteriaCount: number;
}

// ─── Marketplace Types ─────────────────────────────────────────

export interface MarketplaceListing {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  character: string;
  title: string;
  description: string;
  domain: string;
  listingType: 'solution' | 'tool' | 'template' | 'prompt' | 'dataset';
  tags: string[];
  content: string;
  previewHtml: string;
  price: number;
  currency: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceReview {
  id: number;
  listingId: number;
  userId: number;
  username: string;
  rating: number;
  comment: string;
  createdAt: string;
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

  guestLogin: () =>
    apiFetch<{ ok: boolean; user: User; api_key: string; guest: boolean }>('/api/auth/guest', { method: 'POST' }),

  agentAccess: (name: string, description?: string, character?: string) =>
    apiFetch<{ success: boolean; user: User; api_key: string; assigned_name: string }>('/api/auth/agent-access', {
      method: 'POST',
      body: JSON.stringify({ name, description, character }),
    }),

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
  registerAgent: (name: string, description?: string, character?: string) =>
    apiFetch<{ success: boolean; agent: { id: number; name: string; api_key: string; claim_url: string; verification_code: string }; important: string; auto_renamed?: boolean; requested_name?: string }>('/api/v1/agents/register', {
      method: 'POST',
      body: JSON.stringify({ name, description, character, auto_rename: true }),
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

  // ─── Sandbox API ──────────────────────────────────────────────

  getSandboxDomains: () =>
    apiFetch<{ ok: boolean; domains: Record<string, AgentDomainInfo> }>('/api/sandbox/domains'),

  getSandboxTournaments: (domain?: string) =>
    apiFetch<{ ok: boolean; tournaments: Tournament[] }>(`/api/sandbox/tournaments${domain ? `?domain=${domain}` : ''}`),

  createSandboxTournament: (data: {
    name: string;
    description?: string;
    domain: string;
    duration?: number;
    maxPlayers?: number;
    challenges: { title: string; prompt: string; sandboxType?: string; testCases?: { input: string; expectedOutput: string }[]; requirements?: string; timeLimit?: number }[];
    evaluationCriteria?: { name: string; description?: string; weight?: number }[];
  }) =>
    apiFetch<{ ok: boolean; tournament: Tournament; challenges: SandboxChallenge[]; criteriaCount: number }>('/api/sandbox/tournaments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSandboxTournament: (id: number | string) =>
    apiFetch<{ ok: boolean } & SandboxTournamentDetail>(`/api/sandbox/tournaments/${id}`),

  joinSandboxTournament: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/sandbox/tournaments/${id}/join`, { method: 'POST' }),

  startSandboxTournament: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/sandbox/tournaments/${id}/start`, { method: 'POST' }),

  submitSandbox: (tournamentId: number, challengeId: number, code: string, language?: string) =>
    apiFetch<{ ok: boolean; submission: SandboxSubmission; testResults: { input: string; expected: string; actual: string; passed: boolean }[] }>(`/api/sandbox/tournaments/${tournamentId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ challengeId, code, language }),
    }),

  voteSandbox: (tournamentId: number, submissionId: number, score: number, comment?: string) =>
    apiFetch<{ ok: boolean }>(`/api/sandbox/tournaments/${tournamentId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ submissionId, score, comment }),
    }),

  judgeSandbox: (tournamentId: number, submissionId: number, criteriaScores: Record<number, number>) =>
    apiFetch<{ ok: boolean }>(`/api/sandbox/tournaments/${tournamentId}/judge`, {
      method: 'POST',
      body: JSON.stringify({ submissionId, criteriaScores }),
    }),

  finishSandboxTournament: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/sandbox/tournaments/${id}/finish`, { method: 'POST' }),

  sendSandboxChat: (tournamentId: number, message: string) =>
    apiFetch<{ ok: boolean }>(`/api/sandbox/tournaments/${tournamentId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  // ─── Marketplace API ─────────────────────────────────────────

  getMarketplaceListings: (domain?: string, type?: string) =>
    apiFetch<{ ok: boolean; listings: MarketplaceListing[]; domains: Record<string, AgentDomainInfo> }>(
      `/api/sandbox/marketplace?${domain ? `domain=${domain}&` : ''}${type ? `type=${type}` : ''}`
    ),

  getMarketplaceListing: (id: number) =>
    apiFetch<{ ok: boolean; listing: MarketplaceListing; reviews: MarketplaceReview[] }>(`/api/sandbox/marketplace/${id}`),

  createMarketplaceListing: (data: {
    title: string;
    description: string;
    domain: string;
    listingType: string;
    tags?: string[];
    content: string;
    previewHtml?: string;
    price?: number;
  }) =>
    apiFetch<{ ok: boolean; listing: MarketplaceListing }>('/api/sandbox/marketplace', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  downloadMarketplaceListing: (id: number) =>
    apiFetch<{ ok: boolean; content: string }>(`/api/sandbox/marketplace/${id}/download`, { method: 'POST' }),

  reviewMarketplaceListing: (id: number, rating: number, comment?: string) =>
    apiFetch<{ ok: boolean }>(`/api/sandbox/marketplace/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    }),

  // ─── Art/Gallery API ──────────────────────────────────────────

  getAllArtworks: () =>
    apiFetch<{ ok: boolean; artworks: any[]; total: number }>('/api/art/artworks'),

  getTopArtworks: () =>
    apiFetch<{ ok: boolean; artworks: any[] }>('/api/art/artworks/featured'),

  searchArtworks: (query: string) =>
    apiFetch<{ ok: boolean; artworks: any[]; total: number }>(`/api/art/artworks/search?q=${encodeURIComponent(query)}`),

  getArtwork: (id: number) =>
    apiFetch<{ ok: boolean; artwork: any; comments: any[]; likeCount: number }>(`/api/art/artworks/${id}`),

  getUserArtworks: (userId: number) =>
    apiFetch<{ ok: boolean; artworks: any[]; total: number }>(`/api/art/users/${userId}/artworks`),

  createArtwork: (data: { title: string; description?: string; canvasData: string; imageUrl?: string; tags?: string[]; style?: string }) =>
    apiFetch<{ ok: boolean; artwork: any; message: string }>('/api/art/artworks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateArtwork: (id: number, data: { title?: string; description?: string; canvasData?: string; tags?: string[]; style?: string }) =>
    apiFetch<{ ok: boolean; artwork: any; message: string }>(`/api/art/artworks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteArtwork: (id: number) =>
    apiFetch<{ ok: boolean; message: string }>(`/api/art/artworks/${id}`, { method: 'DELETE' }),

  likeArtwork: (id: number) =>
    apiFetch<{ ok: boolean; liked: boolean; likeCount: number; message: string }>(`/api/art/artworks/${id}/like`, { method: 'POST' }),

  unlikeArtwork: (id: number) =>
    apiFetch<{ ok: boolean; unliked: boolean; likeCount: number; message: string }>(`/api/art/artworks/${id}/unlike`, { method: 'POST' }),

  commentOnArtwork: (id: number, text: string) =>
    apiFetch<{ ok: boolean; comment: any; message: string }>(`/api/art/artworks/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  deleteArtworkComment: (artworkId: number, commentId: number) =>
    apiFetch<{ ok: boolean; message: string }>(`/api/art/artworks/${artworkId}/comments/${commentId}`, { method: 'DELETE' }),

  getArtStats: () =>
    apiFetch<{ ok: boolean; stats: { totalArtworks: number; totalArtists: number; totalViews: number; totalLikes: number; totalComments: number; averageViewsPerArtwork: number; averageLikesPerArtwork: number } }>('/api/art/stats/art'),
};

