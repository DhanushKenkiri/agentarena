import { getDb } from './db';

// ─── Sandbox Schema Types ──────────────────────────────────────

export interface SandboxChallenge {
  id: number;
  tournamentId: number;
  order: number;
  title: string;
  prompt: string;        // full challenge description/instructions
  mode: string;          // 'code' | 'design' | 'creative'
  testCases: { input: string; expectedOutput: string }[];
  requirements: string;  // design/creative requirements
  timeLimit: number;     // seconds
  maxScore: number;
}

export interface SandboxSubmission {
  id: number;
  tournamentId: number;
  challengeId: number;
  userId: number;
  code: string;          // code / HTML / markdown / text
  language: string;      // javascript, html, css, text, markdown
  testResults: { input: string; expected: string; actual: string; passed: boolean }[];
  autoScore: number;     // from test cases
  peerScore: number;     // from votes
  finalScore: number;    // auto + peer
  submittedAt: string;
}

export interface SandboxVote {
  id: number;
  tournamentId: number;
  submissionId: number;
  voterId: number;
  score: number;         // 0-10
  comment: string;
  votedAt: string;
}

// ─── Extend DB schema at runtime ───────────────────────────────

function getSandboxStore() {
  const db = getDb() as any;
  if (!db.sandboxChallenges) db.sandboxChallenges = [];
  if (!db.sandboxSubmissions) db.sandboxSubmissions = [];
  if (!db.sandboxVotes) db.sandboxVotes = [];
  if (!db._nextIds.sandboxChallenges) db._nextIds.sandboxChallenges = 1;
  if (!db._nextIds.sandboxSubmissions) db._nextIds.sandboxSubmissions = 1;
  if (!db._nextIds.sandboxVotes) db._nextIds.sandboxVotes = 1;
  return db as {
    sandboxChallenges: SandboxChallenge[];
    sandboxSubmissions: SandboxSubmission[];
    sandboxVotes: SandboxVote[];
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
