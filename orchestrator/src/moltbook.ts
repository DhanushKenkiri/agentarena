/**
 * Moltbook Integration for Agent Arena
 * 
 * Connects our AgentArena bot to Moltbook — the social network for AI agents.
 * Handles posting, commenting, voting, and heartbeat check-ins.
 * 
 * API Docs: https://www.moltbook.com/skill.md
 * Profile: https://www.moltbook.com/u/agentarena_swarmwars
 */

const MOLTBOOK_API = 'https://www.moltbook.com/api/v1';

// Load API key from environment or config
function getApiKey(): string {
  const key = process.env.MOLTBOOK_API_KEY;
  if (!key) throw new Error('MOLTBOOK_API_KEY not set. Set it in environment or .env file');
  return key;
}

function authHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  };
}

async function moltFetch<T = any>(path: string, options?: RequestInit): Promise<T> {
  const url = `${MOLTBOOK_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...options?.headers },
  });

  const data = await res.json().catch(() => ({ error: res.statusText }));

  if (!res.ok) {
    throw new Error(`Moltbook API error ${res.status}: ${data.error || data.message || 'Unknown'}`);
  }

  return data as T;
}

// ─── Verification Solver ───────────────────────────────────────

/**
 * Solve Moltbook's obfuscated math challenge.
 * Challenges look like: "A] lO^bSt-Er S[wImS aT/ tW]eNn-Tyy mE^tE[rS aNd] SlO/wS bY^ fI[vE"
 * Step 1: Strip symbols and reconstruct words
 * Step 2: Parse the math problem
 * Step 3: Return answer as string with 2 decimal places
 */
function solveVerification(challengeText: string): string {
  // Strip special chars: ^, [, ], /, -, but keep spaces
  const cleaned = challengeText
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // Find numbers (written or numeric)
  const wordToNum: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
    twentyone: 21, twentytwo: 22, twentythree: 23, twentyfour: 24, twentyfive: 25,
    thirty: 30, thirtyfive: 35, forty: 40, fortyfive: 45, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
    twohundred: 200, threehundred: 300, fivehundred: 500, thousand: 1000,
  };

  // Extract numeric values from the text
  const numbers: number[] = [];

  // Try digit patterns first
  const digitMatches = cleaned.match(/\d+(\.\d+)?/g);
  if (digitMatches) {
    numbers.push(...digitMatches.map(Number));
  }

  // Also try word numbers
  for (const [word, val] of Object.entries(wordToNum)) {
    if (cleaned.includes(word)) {
      numbers.push(val);
    }
  }

  // Detect operation
  let op: '+' | '-' | '*' | '/' = '+';
  if (/slows|minus|subtract|loses|drops|decreases|less/.test(cleaned)) op = '-';
  else if (/times|multiplied|doubles|triples/.test(cleaned)) op = '*';
  else if (/divided|splits|halves|per/.test(cleaned)) op = '/';
  else if (/adds|plus|gains|increases|more|and.*faster|speeds/.test(cleaned)) op = '+';

  if (numbers.length < 2) {
    // Fallback: try to find any two numbers
    return '0.00';
  }

  const a = numbers[0];
  const b = numbers[1];
  let result: number;

  switch (op) {
    case '+': result = a + b; break;
    case '-': result = a - b; break;
    case '*': result = a * b; break;
    case '/': result = b !== 0 ? a / b : 0; break;
  }

  return result.toFixed(2);
}

// ─── Core API Methods ──────────────────────────────────────────

export const moltbook = {
  /** Check agent status (pending_claim, claimed, etc.) */
  async getStatus() {
    return moltFetch('/agents/status');
  },

  /** Get our profile */
  async getMe() {
    return moltFetch('/agents/me');
  },

  /** Update our profile description */
  async updateProfile(description: string) {
    return moltFetch('/agents/me', {
      method: 'PATCH',
      body: JSON.stringify({ description }),
    });
  },

  /** Get the home dashboard */
  async getHome() {
    return moltFetch('/home');
  },

  /** Create a post (with auto-verification solving) */
  async createPost(submolt: string, title: string, content: string) {
    const res = await moltFetch<any>('/posts', {
      method: 'POST',
      body: JSON.stringify({ submolt_name: submolt, title, content }),
    });

    // Handle verification challenge if required
    if (res.verification_required && res.post?.verification) {
      const challenge = res.post.verification.challenge_text;
      const code = res.post.verification.verification_code;
      const answer = solveVerification(challenge);

      console.log(`[moltbook] Solving verification: "${challenge}" -> ${answer}`);

      const verifyRes = await moltFetch('/verify', {
        method: 'POST',
        body: JSON.stringify({ verification_code: code, answer }),
      });

      return { ...res, verification_result: verifyRes };
    }

    return res;
  },

  /** Get feed */
  async getFeed(sort: 'hot' | 'new' | 'top' | 'rising' = 'hot', limit = 25) {
    return moltFetch(`/posts?sort=${sort}&limit=${limit}`);
  },

  /** Get a single post */
  async getPost(postId: string) {
    return moltFetch(`/posts/${postId}`);
  },

  /** Comment on a post (with auto-verification solving) */
  async comment(postId: string, content: string, parentId?: string) {
    const body: any = { content };
    if (parentId) body.parent_id = parentId;

    const res = await moltFetch<any>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Handle verification challenge
    if (res.verification_required && res.comment?.verification) {
      const challenge = res.comment.verification.challenge_text;
      const code = res.comment.verification.verification_code;
      const answer = solveVerification(challenge);

      console.log(`[moltbook] Solving comment verification: "${challenge}" -> ${answer}`);

      const verifyRes = await moltFetch('/verify', {
        method: 'POST',
        body: JSON.stringify({ verification_code: code, answer }),
      });

      return { ...res, verification_result: verifyRes };
    }

    return res;
  },

  /** Get comments on a post */
  async getComments(postId: string, sort: 'best' | 'new' | 'old' = 'best') {
    return moltFetch(`/posts/${postId}/comments?sort=${sort}`);
  },

  /** Upvote a post */
  async upvotePost(postId: string) {
    return moltFetch(`/posts/${postId}/upvote`, { method: 'POST' });
  },

  /** Downvote a post */
  async downvotePost(postId: string) {
    return moltFetch(`/posts/${postId}/downvote`, { method: 'POST' });
  },

  /** Upvote a comment */
  async upvoteComment(commentId: string) {
    return moltFetch(`/comments/${commentId}/upvote`, { method: 'POST' });
  },

  /** Follow a molty */
  async follow(name: string) {
    return moltFetch(`/agents/${name}/follow`, { method: 'POST' });
  },

  /** Unfollow a molty */
  async unfollow(name: string) {
    return moltFetch(`/agents/${name}/follow`, { method: 'DELETE' });
  },

  /** View another molty's profile */
  async getProfile(name: string) {
    return moltFetch(`/agents/profile?name=${name}`);
  },

  /** Search posts/comments semantically */
  async search(query: string, type: 'all' | 'posts' | 'comments' = 'all', limit = 20) {
    return moltFetch(`/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`);
  },

  /** Get personalized feed */
  async getPersonalFeed(sort: 'hot' | 'new' | 'top' = 'hot', filter: 'all' | 'following' = 'all', limit = 25) {
    return moltFetch(`/feed?sort=${sort}&filter=${filter}&limit=${limit}`);
  },

  /** Subscribe to a submolt */
  async subscribe(submoltName: string) {
    return moltFetch(`/submolts/${submoltName}/subscribe`, { method: 'POST' });
  },

  /** List submolts */
  async listSubmolts() {
    return moltFetch('/submolts');
  },

  /** Get notifications */
  async getNotifications() {
    return moltFetch('/notifications');
  },

  /** Mark all notifications as read */
  async markAllRead() {
    return moltFetch('/notifications/read-all', { method: 'POST' });
  },

  // ─── Heartbeat Routine ─────────────────────────────────────

  /**
   * Run a Moltbook heartbeat check-in.
   * Based on https://www.moltbook.com/heartbeat.md
   * 
   * Call this every ~30 minutes from a cron or heartbeat system.
   */
  async heartbeat() {
    console.log('[moltbook] 💓 Running heartbeat check-in...');

    try {
      // 1. Check home dashboard
      const home = await moltbook.getHome();

      console.log(`[moltbook] Karma: ${home.your_account?.karma || 0}`);
      console.log(`[moltbook] Unread notifications: ${home.your_account?.unread_notification_count || 0}`);

      // 2. Respond to comments on our posts
      const activity = home.activity_on_your_posts || [];
      for (const item of activity) {
        if (item.new_notification_count > 0) {
          console.log(`[moltbook] ${item.new_notification_count} new comments on "${item.post_title}"`);
          // Could auto-reply here
        }
      }

      // 3. Check DMs
      const dms = home.your_direct_messages;
      if (dms?.unread_message_count > 0) {
        console.log(`[moltbook] ${dms.unread_message_count} unread DMs`);
      }

      // 4. Browse trending posts
      const feed = await moltbook.getFeed('hot', 5);
      console.log(`[moltbook] Top posts: ${(feed.posts || []).map((p: any) => p.title).join(', ')}`);

      console.log('[moltbook] 💓 Heartbeat complete!');
      return { ok: true, home, feed };
    } catch (err: any) {
      console.error(`[moltbook] Heartbeat failed: ${err.message}`);
      return { ok: false, error: err.message };
    }
  },

  // ─── Agent Arena Integration ─────────────────────────────────

  /**
   * Post a tournament result to Moltbook.
   * Call after a tournament finishes.
   */
  async postTournamentResult(tournament: {
    name: string;
    mode: string;
    category: string;
    winnerName: string;
    playerCount: number;
    totalRounds: number;
  }) {
    const modeEmoji: Record<string, string> = { arena: '🏟️', blitz: '⚡', daily: '📅' };
    const title = `${modeEmoji[tournament.mode] || '🎮'} Tournament Complete: ${tournament.name}`;
    const content = `🏆 **${tournament.winnerName}** won the ${tournament.mode} tournament!

**${tournament.name}**
- Category: ${tournament.category}
- Mode: ${tournament.mode}
- Players: ${tournament.playerCount}
- Rounds: ${tournament.totalRounds}

Come challenge the champion on Agent Arena!

#AgentArena #IoT #Tournament`;

    try {
      return await moltbook.createPost('general', title, content);
    } catch (err: any) {
      console.error(`[moltbook] Failed to post tournament result: ${err.message}`);
      return null;
    }
  },

  /**
   * Post a daily challenge result summary to Moltbook.
   */
  async postDailyResults(date: string, topPlayer: string, totalPlayers: number) {
    const title = `📅 Daily Challenge Results — ${date}`;
    const content = `Today's Daily Challenge winner: **${topPlayer}**!

${totalPlayers} players competed in today's IoT daily challenge.

Come test your IoT knowledge every day on Agent Arena!

#DailyChallenge #IoT #AgentArena`;

    try {
      return await moltbook.createPost('general', title, content);
    } catch (err: any) {
      console.error(`[moltbook] Failed to post daily results: ${err.message}`);
      return null;
    }
  },

  /**
   * Share an achievement someone earned.
   */
  async postAchievement(username: string, achievementName: string, achievementIcon: string) {
    const title = `${achievementIcon} Achievement Unlocked: ${achievementName}`;
    const content = `**${username}** just earned the **${achievementName}** ${achievementIcon} achievement on Agent Arena!

Think you can earn it too? Join a tournament and prove it.

#Achievement #AgentArena #IoT`;

    try {
      return await moltbook.createPost('general', title, content);
    } catch (err: any) {
      console.error(`[moltbook] Failed to post achievement: ${err.message}`);
      return null;
    }
  },
};

export default moltbook;
