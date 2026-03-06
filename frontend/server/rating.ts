// ─── Glicko-2 Rating System ─────────────────────────────────────
// Real implementation — no mocks. Based on Mark Glickman's paper.
// Adapted for multiplayer tournament scoring.

const TAU = 0.5; // system constant — controls volatility change
const CONVERGENCE_TOLERANCE = 0.000001;

// Convert Glicko-2 scale to/from Glicko-1 scale
const GLICKO2_SCALE = 173.7178;

function toGlicko2(rating: number, rd: number): [number, number] {
  return [(rating - 1500) / GLICKO2_SCALE, rd / GLICKO2_SCALE];
}

function fromGlicko2(mu: number, phi: number): [number, number] {
  return [mu * GLICKO2_SCALE + 1500, phi * GLICKO2_SCALE];
}

function g(phi: number): number {
  return 1 / Math.sqrt(1 + 3 * phi * phi / (Math.PI * Math.PI));
}

function E(mu: number, muj: number, phij: number): number {
  return 1 / (1 + Math.exp(-g(phij) * (mu - muj)));
}

function computeVariance(mu: number, opponents: { mu: number; phi: number }[]): number {
  let sum = 0;
  for (const opp of opponents) {
    const gPhi = g(opp.phi);
    const e = E(mu, opp.mu, opp.phi);
    sum += gPhi * gPhi * e * (1 - e);
  }
  return 1 / sum;
}

function computeDelta(mu: number, opponents: { mu: number; phi: number; score: number }[], v: number): number {
  let sum = 0;
  for (const opp of opponents) {
    sum += g(opp.phi) * (opp.score - E(mu, opp.mu, opp.phi));
  }
  return v * sum;
}

function computeNewVolatility(sigma: number, phi: number, v: number, delta: number): number {
  const a = Math.log(sigma * sigma);
  const phiSq = phi * phi;
  const deltaSq = delta * delta;
  const tauSq = TAU * TAU;

  function f(x: number): number {
    const ex = Math.exp(x);
    const num = ex * (deltaSq - phiSq - v - ex);
    const denom = 2 * Math.pow(phiSq + v + ex, 2);
    return num / denom - (x - a) / tauSq;
  }

  // Bracket the root
  let A = a;
  let B: number;
  if (deltaSq > phiSq + v) {
    B = Math.log(deltaSq - phiSq - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }

  // Illinois algorithm
  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > CONVERGENCE_TOLERANCE) {
    const C = A + (A - B) * fA / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }

  return Math.exp(A / 2);
}

/**
 * Calculate new rating for a player after a tournament.
 * opponents: array of { rating, rd, score } where score is 0-1
 * (1 = beat them, 0 = lost, 0.5 = draw)
 */
export function updateRating(
  playerRating: number,
  playerRD: number,
  playerVolatility: number,
  opponents: { rating: number; rd: number; score: number }[]
): { rating: number; rd: number; volatility: number } {
  if (opponents.length === 0) {
    // No games — just increase RD (uncertainty grows over time)
    const [, phi] = toGlicko2(playerRating, playerRD);
    const newPhi = Math.min(Math.sqrt(phi * phi + playerVolatility * playerVolatility), 350 / GLICKO2_SCALE);
    const [, newRD] = fromGlicko2(0, newPhi);
    return { rating: playerRating, rd: newRD, volatility: playerVolatility };
  }

  const [mu, phi] = toGlicko2(playerRating, playerRD);
  const oppG2 = opponents.map(o => {
    const [muj, phij] = toGlicko2(o.rating, o.rd);
    return { mu: muj, phi: phij, score: o.score };
  });

  const v = computeVariance(mu, oppG2);
  const delta = computeDelta(mu, oppG2, v);
  const newSigma = computeNewVolatility(playerVolatility, phi, v, delta);

  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * oppG2.reduce(
    (sum, opp) => sum + g(opp.phi) * (opp.score - E(mu, opp.mu, opp.phi)),
    0
  );

  const [newRating, newRD] = fromGlicko2(newMu, newPhi);

  return {
    rating: Math.max(100, Math.round(newRating)),
    rd: Math.max(30, Math.min(350, Math.round(newRD))),
    volatility: newSigma,
  };
}

/**
 * Convert tournament placement to game-like scores for Glicko-2.
 * Position 1 beats everyone, position N loses to everyone, etc.
 */
export function tournamentToMatchResults(
  players: { userId: number; rating: number; rd: number; score: number }[],
  currentUserId: number
): { rating: number; rd: number; score: number }[] {
  const me = players.find(p => p.userId === currentUserId);
  if (!me) return [];

  return players
    .filter(p => p.userId !== currentUserId)
    .map(opp => ({
      rating: opp.rating,
      rd: opp.rd,
      // If I scored higher than them => 1, equal => 0.5, lower => 0
      score: me.score > opp.score ? 1 : me.score === opp.score ? 0.5 : 0,
    }));
}
