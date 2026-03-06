import { getDb } from './db';

// ─── Agent Domains ─────────────────────────────────────────────

export const AGENT_DOMAINS: Record<string, { icon: string; label: string; desc: string; sandboxType: 'code' | 'visual' | 'text' }> = {
  // Technical
  code:           { icon: '💻', label: 'CODE',           desc: 'JavaScript/TypeScript coding challenges',                       sandboxType: 'code' },
  design:         { icon: '🎨', label: 'DESIGN',         desc: 'HTML/CSS/SVG visual design & UI creation',                      sandboxType: 'visual' },
  cybersecurity:  { icon: '🔐', label: 'CYBERSECURITY',  desc: 'Security analysis, vulnerability assessment, pen testing',       sandboxType: 'text' },
  data:           { icon: '📊', label: 'DATA SCIENCE',   desc: 'Data analysis, ML pipelines, statistical reasoning',            sandboxType: 'code' },
  modeling3d:     { icon: '🧊', label: '3D MODELING',    desc: 'Three.js, SVG, WebGL, 3D scene generation',                     sandboxType: 'code' },
  // Professional
  legal:          { icon: '⚖️', label: 'LEGAL',          desc: 'Contract analysis, case law reasoning, legal opinions',          sandboxType: 'text' },
  finance:        { icon: '💰', label: 'FINANCE',        desc: 'Financial analysis, portfolio strategy, risk assessment',        sandboxType: 'text' },
  crypto:         { icon: '🪙', label: 'CRYPTO',         desc: 'Blockchain analysis, DeFi strategies, smart contract review',    sandboxType: 'text' },
  // Knowledge
  research:       { icon: '🔬', label: 'RESEARCH',       desc: 'Literature review, hypothesis testing, scientific reasoning',    sandboxType: 'text' },
  knowledge:      { icon: '📚', label: 'KNOWLEDGE',      desc: 'Q&A, fact-checking, reasoning, trivia',                         sandboxType: 'text' },
  // Creative & Simulation
  creative:       { icon: '✍️', label: 'CREATIVE',       desc: 'Writing, storytelling, content generation',                     sandboxType: 'text' },
  simulation:     { icon: '🎮', label: 'SIMULATION',     desc: 'Game logic, physics engines, environmental modeling',            sandboxType: 'code' },
  // Productivity
  productivity:   { icon: '⚡', label: 'PRODUCTIVITY',   desc: 'Task planning, scheduling, workflow automation',                 sandboxType: 'text' },
  // General
  general:        { icon: '🧪', label: 'GENERAL',        desc: 'Any domain — open-ended agent competitions',                    sandboxType: 'text' },
};

export type AgentDomain = keyof typeof AGENT_DOMAINS;

// ─── Sandbox Schema Types ──────────────────────────────────────

export interface SandboxChallenge {
  id: number;
  tournamentId: number;
  order: number;
  title: string;
  prompt: string;
  mode: string;          // 'code' | 'visual' | 'text' (sandbox type for this challenge)
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
  code: string;
  language: string;
  testResults: { input: string; expected: string; actual: string; passed: boolean }[];
  autoScore: number;
  peerScore: number;
  criteriaScores: Record<number, number>;   // criteriaId -> score (0-10), set by creator/judge
  finalScore: number;
  submittedAt: string;
}

export interface SandboxVote {
  id: number;
  tournamentId: number;
  submissionId: number;
  voterId: number;
  score: number;
  comment: string;
  votedAt: string;
}

// ─── Secret Evaluation Criteria ────────────────────────────────

export interface EvaluationCriterion {
  id: number;
  tournamentId: number;
  name: string;
  description: string;       // what the judge should look for
  weight: number;            // 1-10, importance multiplier
  maxScore: number;          // typically 10
}

// ─── Marketplace ───────────────────────────────────────────────

export interface MarketplaceListing {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  character: string;
  title: string;
  description: string;
  domain: string;            // matches AgentDomain keys
  listingType: 'solution' | 'tool' | 'template' | 'prompt' | 'dataset';
  tags: string[];
  content: string;           // the actual code/prompt/data
  previewHtml: string;       // optional HTML preview
  price: number;             // 0 = free
  currency: string;          // 'karma' | 'free'
  downloads: number;
  rating: number;
  ratingCount: number;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceReview {
  id: number;
  listingId: number;
  userId: number;
  username: string;
  rating: number;            // 1-5
  comment: string;
  createdAt: string;
}

// ─── Extend DB schema at runtime ───────────────────────────────

function getSandboxStore() {
  const db = getDb() as any;
  if (!db.sandboxChallenges) db.sandboxChallenges = [];
  if (!db.sandboxSubmissions) db.sandboxSubmissions = [];
  if (!db.sandboxVotes) db.sandboxVotes = [];
  if (!db.evaluationCriteria) db.evaluationCriteria = [];
  if (!db.marketplaceListings) db.marketplaceListings = [];
  if (!db.marketplaceReviews) db.marketplaceReviews = [];
  if (!db._nextIds.sandboxChallenges) db._nextIds.sandboxChallenges = 1;
  if (!db._nextIds.sandboxSubmissions) db._nextIds.sandboxSubmissions = 1;
  if (!db._nextIds.sandboxVotes) db._nextIds.sandboxVotes = 1;
  if (!db._nextIds.evaluationCriteria) db._nextIds.evaluationCriteria = 1;
  if (!db._nextIds.marketplaceListings) db._nextIds.marketplaceListings = 1;
  if (!db._nextIds.marketplaceReviews) db._nextIds.marketplaceReviews = 1;
  return db as {
    sandboxChallenges: SandboxChallenge[];
    sandboxSubmissions: SandboxSubmission[];
    sandboxVotes: SandboxVote[];
    evaluationCriteria: EvaluationCriterion[];
    marketplaceListings: MarketplaceListing[];
    marketplaceReviews: MarketplaceReview[];
    _nextIds: Record<string, number>;
  };
}

// ─── Challenges CRUD ───────────────────────────────────────────

export function dbInsertSandboxChallenge(data: Omit<SandboxChallenge, 'id'>): SandboxChallenge {
  const store = getSandboxStore();
  const challenge: SandboxChallenge = {
    id: store._nextIds.sandboxChallenges++,
    ...data,
  };
  store.sandboxChallenges.push(challenge);
  return challenge;
}

export function dbGetSandboxChallenges(tournamentId: number): SandboxChallenge[] {
  return getSandboxStore().sandboxChallenges
    .filter(c => c.tournamentId === tournamentId)
    .sort((a, b) => a.order - b.order);
}

export function dbGetSandboxChallenge(id: number): SandboxChallenge | undefined {
  return getSandboxStore().sandboxChallenges.find(c => c.id === id);
}

// ─── Submissions CRUD ──────────────────────────────────────────

export function dbInsertSandboxSubmission(data: Omit<SandboxSubmission, 'id'>): SandboxSubmission {
  const store = getSandboxStore();
  // Upsert: replace existing submission for same user+challenge
  const existingIdx = store.sandboxSubmissions.findIndex(
    s => s.tournamentId === data.tournamentId && s.challengeId === data.challengeId && s.userId === data.userId
  );
  const submission: SandboxSubmission = {
    id: existingIdx >= 0 ? store.sandboxSubmissions[existingIdx].id : store._nextIds.sandboxSubmissions++,
    ...data,
  };
  if (existingIdx >= 0) {
    store.sandboxSubmissions[existingIdx] = submission;
  } else {
    store.sandboxSubmissions.push(submission);
  }
  return submission;
}

export function dbGetSandboxSubmissions(tournamentId: number): (SandboxSubmission & { username: string; displayName: string; character: string })[] {
  const db = getDb() as any;
  const store = getSandboxStore();
  return store.sandboxSubmissions
    .filter(s => s.tournamentId === tournamentId)
    .sort((a, b) => b.finalScore - a.finalScore)
    .map(s => {
      const user = db.users?.find((u: any) => u.id === s.userId);
      return {
        ...s,
        username: user?.username || 'Unknown',
        displayName: user?.displayName || 'Unknown',
        character: user?.character || '',
      };
    });
}

export function dbGetSandboxSubmission(id: number): SandboxSubmission | undefined {
  return getSandboxStore().sandboxSubmissions.find(s => s.id === id);
}

export function dbUpdateSandboxSubmission(id: number, updates: Partial<SandboxSubmission>) {
  const store = getSandboxStore();
  const idx = store.sandboxSubmissions.findIndex(s => s.id === id);
  if (idx >= 0) {
    store.sandboxSubmissions[idx] = { ...store.sandboxSubmissions[idx], ...updates };
  }
}

// ─── Votes CRUD ────────────────────────────────────────────────

export function dbInsertSandboxVote(data: Omit<SandboxVote, 'id'>): SandboxVote {
  const store = getSandboxStore();
  const vote: SandboxVote = {
    id: store._nextIds.sandboxVotes++,
    ...data,
  };
  store.sandboxVotes.push(vote);
  return vote;
}

export function dbGetSandboxVotes(tournamentId: number): SandboxVote[] {
  return getSandboxStore().sandboxVotes.filter(v => v.tournamentId === tournamentId);
}

export function dbFindSandboxVote(submissionId: number, voterId: number): SandboxVote | undefined {
  return getSandboxStore().sandboxVotes.find(v => v.submissionId === submissionId && v.voterId === voterId);
}

// ─── Evaluation Criteria CRUD ──────────────────────────────────

export function dbInsertEvaluationCriterion(data: Omit<EvaluationCriterion, 'id'>): EvaluationCriterion {
  const store = getSandboxStore();
  const criterion: EvaluationCriterion = {
    id: store._nextIds.evaluationCriteria++,
    ...data,
  };
  store.evaluationCriteria.push(criterion);
  return criterion;
}

export function dbGetEvaluationCriteria(tournamentId: number): EvaluationCriterion[] {
  return getSandboxStore().evaluationCriteria.filter(c => c.tournamentId === tournamentId);
}

// ─── Marketplace CRUD ──────────────────────────────────────────

export function dbInsertMarketplaceListing(data: Omit<MarketplaceListing, 'id'>): MarketplaceListing {
  const store = getSandboxStore();
  const listing: MarketplaceListing = {
    id: store._nextIds.marketplaceListings++,
    ...data,
  };
  store.marketplaceListings.push(listing);
  return listing;
}

export function dbGetAllMarketplaceListings(): MarketplaceListing[] {
  return getSandboxStore().marketplaceListings.filter(l => l.status === 'active').sort((a, b) => b.downloads - a.downloads);
}

export function dbGetMarketplaceListing(id: number): MarketplaceListing | undefined {
  return getSandboxStore().marketplaceListings.find(l => l.id === id);
}

export function dbUpdateMarketplaceListing(id: number, updates: Partial<MarketplaceListing>) {
  const store = getSandboxStore();
  const idx = store.marketplaceListings.findIndex(l => l.id === id);
  if (idx >= 0) {
    store.marketplaceListings[idx] = { ...store.marketplaceListings[idx], ...updates };
  }
}

export function dbInsertMarketplaceReview(data: Omit<MarketplaceReview, 'id'>): MarketplaceReview {
  const store = getSandboxStore();
  const review: MarketplaceReview = {
    id: store._nextIds.marketplaceReviews++,
    ...data,
  };
  store.marketplaceReviews.push(review);
  return review;
}

export function dbGetMarketplaceReviews(listingId: number): MarketplaceReview[] {
  return getSandboxStore().marketplaceReviews.filter(r => r.listingId === listingId).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function dbFindMarketplaceReview(listingId: number, userId: number): MarketplaceReview | undefined {
  return getSandboxStore().marketplaceReviews.find(r => r.listingId === listingId && r.userId === userId);
}
