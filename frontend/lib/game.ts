/**
 * Retro pixel character system for Agent Arena.
 * Each AI agent and player gets a unique pixel character.
 */

// ─── Character Sprites (emoji-based pixel characters) ──────────

export interface GameCharacter {
  id: string;
  name: string;
  sprite: string;       // emoji/text sprite
  color: string;        // neon color
  title: string;        // character class title
  passive: string;      // flavor text ability
}

export const CHARACTERS: GameCharacter[] = [
  { id: 'warrior',    name: 'Pixel Warrior',     sprite: '⚔️',  color: '#ffffff', title: 'IoT Warrior',       passive: '+1 Combat Power per streak' },
  { id: 'mage',       name: 'Data Mage',         sprite: '🧙',  color: '#cccccc', title: 'Data Sorcerer',     passive: 'Protocol mastery' },
  { id: 'ranger',     name: 'Cyber Ranger',      sprite: '🏹',  color: '#ffffff', title: 'Network Scout',     passive: 'Fast answer bonus' },
  { id: 'knight',     name: 'Shield Knight',      sprite: '🛡️',  color: '#dddddd', title: 'Security Guardian', passive: 'Defense against wrong answers' },
  { id: 'ninja',      name: 'Shadow Ninja',       sprite: '🥷',  color: '#aaaaaa', title: 'Stealth Agent',     passive: 'Speed bonus x2' },
  { id: 'robot',      name: 'Mecha Unit',         sprite: '🤖',  color: '#eeeeee', title: 'AI Construct',      passive: 'Bot precision mode' },
  { id: 'dragon',     name: 'Byte Dragon',        sprite: '🐉',  color: '#bbbbbb', title: 'Fire Breather',     passive: 'Streak fire damage' },
  { id: 'wizard',     name: 'Code Wizard',        sprite: '🧑‍💻', color: '#ffffff', title: 'Arch Coder',        passive: 'Algorithm insight' },
  { id: 'ghost',      name: 'Phantom Node',       sprite: '👻',  color: '#999999', title: 'Ghost Process',     passive: 'Invisible until scored' },
  { id: 'alien',      name: 'Xeno Probe',         sprite: '👽',  color: '#ffffff', title: 'Alien Intelligence', passive: 'Unknown protocol mastery' },
  { id: 'skull',      name: 'Doom Agent',          sprite: '💀',  color: '#888888', title: 'Death Protocol',    passive: 'Eliminate wrong options' },
  { id: 'crown',      name: 'Royal Byte',          sprite: '👑',  color: '#ffffff', title: 'Tournament King',   passive: 'Leaderboard bonus' },
  { id: 'crystal',    name: 'Crystal Core',        sprite: '💎',  color: '#eeeeee', title: 'Diamond Mind',      passive: 'Perfect accuracy buff' },
  { id: 'flame',      name: 'Inferno Bot',         sprite: '🔥',  color: '#bbbbbb', title: 'Fire Elemental',    passive: 'Streak multiplier x3' },
  { id: 'thunder',    name: 'Thunder Strike',      sprite: '⚡',  color: '#ffffff', title: 'Lightning Agent',   passive: 'Instant answer bonus' },
  { id: 'star',       name: 'Nova Star',           sprite: '⭐',  color: '#ffffff', title: 'Star Commander',    passive: 'XP gain x1.5' },
];

export function getCharacter(id: string): GameCharacter {
  return CHARACTERS.find(c => c.id === id) || CHARACTERS[0];
}

export function getCharacterForUser(userId: number, characterId?: string): GameCharacter {
  if (characterId) {
    return getCharacter(characterId);
  }
  // Deterministic assignment based on userId
  return CHARACTERS[userId % CHARACTERS.length];
}

// ─── Level / Rank system ───────────────────────────────────────

export interface GameLevel {
  level: number;
  title: string;
  minRating: number;
  color: string;
  badge: string;     // css class
  icon: string;
}

export const LEVELS: GameLevel[] = [
  { level: 1, title: 'Newbie',      minRating: 0,    color: '#555555', badge: 'bronze',  icon: '🌑' },
  { level: 2, title: 'Apprentice',  minRating: 1200, color: '#666666', badge: 'bronze',  icon: '🌘' },
  { level: 3, title: 'Adventurer',  minRating: 1350, color: '#777777', badge: 'bronze',  icon: '🌗' },
  { level: 4, title: 'Warrior',     minRating: 1450, color: '#999999', badge: 'silver',  icon: '🌖' },
  { level: 5, title: 'Knight',      minRating: 1550, color: '#aaaaaa', badge: 'silver',  icon: '🌕' },
  { level: 6, title: 'Expert',      minRating: 1650, color: '#cccccc', badge: 'gold',    icon: '⭐' },
  { level: 7, title: 'Master',      minRating: 1800, color: '#dddddd', badge: 'gold',    icon: '🌟' },
  { level: 8, title: 'Champion',    minRating: 1950, color: '#eeeeee', badge: 'diamond', icon: '💎' },
  { level: 9, title: 'Legend',      minRating: 2100, color: '#ffffff', badge: 'master',  icon: '🔥' },
  { level: 10, title: 'Mythic',     minRating: 2300, color: '#ffffff', badge: 'master',  icon: '👑' },
];

export function getLevelForRating(rating: number): GameLevel {
  let result = LEVELS[0];
  for (const lvl of LEVELS) {
    if (rating >= lvl.minRating) result = lvl;
  }
  return result;
}

export function getXpProgress(rating: number): { current: number; next: number; percent: number } {
  const currentLevel = getLevelForRating(rating);
  const idx = LEVELS.indexOf(currentLevel);
  const nextLevel = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;

  if (!nextLevel) return { current: rating, next: rating, percent: 100 };

  const range = nextLevel.minRating - currentLevel.minRating;
  const progress = rating - currentLevel.minRating;
  const percent = Math.min(100, Math.round((progress / range) * 100));

  return { current: rating, next: nextLevel.minRating, percent };
}

// ─── Power-ups / Items (REAL — synced with backend) ────────────

export interface PowerUp {
  id: string;
  name: string;
  icon: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const POWERUPS: PowerUp[] = [
  { id: 'hint',       name: 'Oracle Hint',  icon: '🔮', description: 'Eliminate 2 wrong options', rarity: 'legendary' },
  { id: 'shield',     name: 'Error Shield', icon: '🛡️', description: 'Protect your streak on a wrong answer', rarity: 'rare' },
  { id: 'double_xp',  name: 'Double XP',    icon: '✨', description: '2x score for this round', rarity: 'epic' },
];

export function getPowerUp(id: string): PowerUp | undefined {
  return POWERUPS.find(p => p.id === id);
}

// ─── Achievement Badges (REAL — synced with backend) ───────────

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood',    name: 'First Blood',      icon: '🗡️',  description: 'Win your first tournament' },
  { id: 'streak_master',  name: 'Streak Master',     icon: '🔥',  description: 'Get a 5+ answer streak' },
  { id: 'speed_demon',    name: 'Speed Demon',       icon: '⚡',  description: 'Answer correctly in under 3 seconds' },
  { id: 'perfect_game',   name: 'Perfect Game',      icon: '💯',  description: 'Get all answers correct in a tournament' },
  { id: 'bot_slayer',     name: 'Bot Slayer',        icon: '🤖',  description: 'Beat an AI bot in a tournament' },
  { id: 'veteran',        name: 'Veteran',           icon: '🎖️',  description: 'Play 10 tournaments' },
  { id: 'legend',         name: 'Legend',            icon: '👑',  description: 'Reach 2000+ rating' },
  { id: 'upset_king',     name: 'Upset King',        icon: '🎯',  description: 'Beat someone 200+ rating above you' },
  { id: 'blitz_ace',      name: 'Blitz Ace',         icon: '💨',  description: 'Win 5 blitz matches' },
  { id: 'daily_warrior',  name: 'Daily Warrior',     icon: '📅',  description: 'Complete 7 daily challenges in a row' },
  { id: 'century',        name: 'Century',           icon: '💯',  description: 'Score 100+ total points in one tournament' },
  { id: 'collector',      name: 'Collector',         icon: '🎒',  description: 'Use 10 power-ups' },
];

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}
