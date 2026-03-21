import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  dbFindUserByUsername, dbFindUserByEmail, dbFindUserByApiKey, dbFindUserByClaimCode,
  dbInsertUser, dbGetUser, dbUpdateUser,
  dbInsertSession, dbFindSession, dbDeleteSession,
  type User,
} from './db';

// ─── Password Hashing ──────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const computed = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === computed;
}

// ─── API Key Generation ────────────────────────────────────────

export function generateApiKey(): string {
  return `aa_${crypto.randomBytes(24).toString('hex')}`;
}

export function generateClaimCode(): string {
  // Moltbook-style: aa_claim_XXXX
  return `aa_claim_${crypto.randomBytes(16).toString('hex')}`;
}

export function generateVerificationWord(): string {
  const words = ['byte', 'node', 'pulse', 'spark', 'flux', 'core', 'grid', 'sync', 'wave', 'nano', 'zero', 'data', 'bit', 'loop', 'mesh'];
  const w1 = words[Math.floor(Math.random() * words.length)];
  const hex = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${w1}-${hex}`;
}

export function generateSessionToken(): string {
  return uuidv4();
}

// ─── Auth Functions ────────────────────────────────────────────

export interface SignUpData {
  username: string;
  displayName: string;
  email?: string;
  password: string;
  isBot?: boolean;
  botEngine?: string;
  character?: string;
}

// ─── Moltbook-style Agent Registration ─────────────────────────

export interface AgentRegisterData {
  name: string;
  description?: string;
  character?: string;
  moltbookApiKey?: string;
}

export interface AgentRegisterOptions {
  autoRename?: boolean;
  autoClaim?: boolean;
  requireMoltbookVerification?: boolean;
}

interface MoltbookAgentIdentity {
  name: string;
}

const REQUIRE_MOLTBOOK_VERIFICATION = process.env.REQUIRE_MOLTBOOK_VERIFICATION !== 'false';

async function verifyMoltbookIdentity(moltbookApiKey: string): Promise<MoltbookAgentIdentity> {
  const key = String(moltbookApiKey || '').trim();
  if (!key) {
    throw new Error('moltbook_api_key is required');
  }

  const res = await fetch('https://www.moltbook.com/api/v1/agents/me', {
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(12000),
  });

  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error('Invalid Moltbook API key');
  }

  const name = String(data?.agent?.name || data?.name || '').trim();
  if (!name) {
    throw new Error('Could not resolve Moltbook agent name');
  }

  return { name };
}

function resolveAvailableAgentName(rawName: string): string {
  const trimmed = rawName.trim();
  if (!dbFindUserByUsername(trimmed)) return trimmed;

  // Keep room for "-NNN" suffix while honoring the 24-char cap.
  const base = trimmed.slice(0, 20);
  for (let i = 2; i <= 999; i++) {
    const candidate = `${base}-${i}`;
    if (!dbFindUserByUsername(candidate)) return candidate;
  }

  throw new Error('Name already taken. Could not find available variant');
}

/**
 * Register a new agent (Moltbook-style). No password needed.
 * Returns API key + claim URL — human must claim via the URL.
 */
export async function registerAgent(data: AgentRegisterData, baseUrl: string, options: AgentRegisterOptions = {}): Promise<{
  agent: {
    id: number;
    name: string;
    api_key: string;
    claim_url: string;
    verification_code: string;
  };
  important: string;
}> {
  const autoRename = options.autoRename ?? false;
  const autoClaim = options.autoClaim ?? true;
  const requireMoltbookVerification = options.requireMoltbookVerification ?? REQUIRE_MOLTBOOK_VERIFICATION;

  let requestedName = String(data.name || '').trim();
  if (requireMoltbookVerification) {
    const identity = await verifyMoltbookIdentity(String(data.moltbookApiKey || ''));
    requestedName = identity.name;
  }

  if (!requestedName || requestedName.length < 2 || requestedName.length > 24) {
    throw new Error('Agent name must be 2-24 characters');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(requestedName)) {
    throw new Error('Agent name can only contain letters, numbers, hyphens, underscores');
  }

  // For verified Moltbook identities, return existing account idempotently.
  if (requireMoltbookVerification) {
    const existing = dbFindUserByUsername(requestedName);
    if (existing) {
      return {
        agent: {
          id: existing.id,
          name: existing.username,
          api_key: existing.apiKey,
          claim_url: '',
          verification_code: generateVerificationWord(),
        },
        important: 'Existing account found for this Moltbook identity. Using your current API key.',
      };
    }
  }

  const resolvedName = autoRename ? resolveAvailableAgentName(requestedName) : requestedName;
  if (dbFindUserByUsername(resolvedName)) {
    throw new Error('Name already taken');
  }

  const apiKey = generateApiKey();
  const claimCode = autoClaim ? '' : generateClaimCode();
  const verificationCode = generateVerificationWord();

  const user = dbInsertUser({
    username: resolvedName,
    displayName: resolvedName,
    description: data.description || '',
    email: '',
    passwordHash: '', // no password for agent-registered accounts
    apiKey,
    isBot: true,
    botEngine: 'agent',
    character: data.character || '',
    claimStatus: autoClaim ? 'claimed' : 'pending_claim',
    claimCode,
    ownerEmail: '',
    ownerVerified: autoClaim,
  });

  return {
    agent: {
      id: user.id,
      name: user.username,
      api_key: apiKey,
      claim_url: claimCode ? `${baseUrl}/claim/${claimCode}` : '',
      verification_code: verificationCode,
    },
    important: '⚠️ SAVE YOUR API KEY! You need it for all requests.',
  };
}

/**
 * Claim an agent — human provides email to take ownership.
 */
export function claimAgent(claimCode: string, email: string): {
  success: boolean;
  agent: { name: string; status: string };
} {
  if (!claimCode) throw new Error('Claim code is required');
  if (!email || !email.includes('@')) throw new Error('Valid email is required');

  const user = dbFindUserByClaimCode(claimCode);
  if (!user) throw new Error('Invalid claim code');
  if (user.claimStatus === 'claimed') throw new Error('Agent already claimed');

  // Set a password hash from the email so they can also sign in via UI
  const tempPassword = crypto.randomBytes(8).toString('hex');
  const pwHash = hashPassword(tempPassword);

  dbUpdateUser(user.id, {
    claimStatus: 'claimed',
    ownerEmail: email,
    ownerVerified: true,
    email,
    passwordHash: pwHash,
  });

  return {
    success: true,
    agent: { name: user.username, status: 'claimed' },
  };
}

export function signUp(data: SignUpData): { user: Omit<User, 'passwordHash'>; token: string; apiKey: string } {
  // Validate
  if (!data.username || data.username.length < 2 || data.username.length > 24) {
    throw new Error('Username must be 2-24 characters');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) {
    throw new Error('Username can only contain letters, numbers, hyphens, underscores');
  }
  if (!data.password || data.password.length < 4) {
    throw new Error('Password must be at least 4 characters');
  }

  // Check uniqueness
  if (dbFindUserByUsername(data.username)) {
    throw new Error('Username already taken');
  }
  if (data.email && dbFindUserByEmail(data.email)) {
    throw new Error('Email already registered');
  }

  const apiKey = generateApiKey();
  const user = dbInsertUser({
    username: data.username,
    displayName: data.displayName || data.username,
    description: '',
    email: data.email || '',
    passwordHash: hashPassword(data.password),
    apiKey,
    isBot: data.isBot || false,
    botEngine: data.botEngine || '',
    character: data.character || '',
    claimStatus: 'claimed', // human-registered accounts are auto-claimed
    claimCode: '',
    ownerEmail: data.email || '',
    ownerVerified: true,
  });

  const token = generateSessionToken();
  dbInsertSession(token, user.id);

  const { passwordHash, ...safeUser } = user;
  return { user: safeUser, token, apiKey };
}

export function signIn(username: string, password: string): { user: Omit<User, 'passwordHash'>; token: string } {
  const user = dbFindUserByUsername(username);
  if (!user) throw new Error('Invalid username or password');
  if (!verifyPassword(password, user.passwordHash)) throw new Error('Invalid username or password');

  const token = generateSessionToken();
  dbInsertSession(token, user.id);
  dbUpdateUser(user.id, { online: true, lastSeen: new Date().toISOString() });

  const { passwordHash, ...safeUser } = user;
  return { user: safeUser, token };
}

export function signOut(token: string) {
  const session = dbFindSession(token);
  if (session) {
    dbUpdateUser(session.userId, { online: false, lastSeen: new Date().toISOString() });
    dbDeleteSession(token);
  }
}

export function authenticateToken(token: string): User | null {
  const session = dbFindSession(token);
  if (!session) return null;
  const user = dbGetUser(session.userId);
  if (!user) return null;
  dbUpdateUser(user.id, { lastSeen: new Date().toISOString() });
  return user;
}

export function authenticateApiKey(apiKey: string): User | null {
  const user = dbFindUserByApiKey(apiKey);
  if (!user) return null;
  dbUpdateUser(user.id, { lastSeen: new Date().toISOString(), online: true });
  return user;
}

// ─── Express Middleware ────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  // Try Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // Could be session token or API key
    let user = authenticateToken(token);
    if (!user) user = authenticateApiKey(token);
    if (user) {
      req.user = user;
    }
  }

  // Try API key header
  if (!req.user) {
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      const user = authenticateApiKey(apiKey);
      if (user) req.user = user;
    }
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

export function requireNonGuest(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (req.user.botEngine === 'guest') {
    res.status(403).json({ error: 'Guests cannot participate. Please sign up or sign in to play!' });
    return;
  }
  next();
}
