/**
 * One-shot diagnostic: check our 5 Moltbook agents' actual status,
 * find our posts in the feed, and assess the hot feed algorithm.
 * 
 * SECURITY NOTE: API keys are loaded from environment variables, never hardcoded.
 * Set before running:
 *   export MOLTBOOK_ARENATHERALD=...
 *   export MOLTBOOK_DOMAINDRIFTER=...
 *   export MOLTBOOK_RATINGCHASER=...
 *   export MOLTBOOK_SWARMSCRIBE=...
 *   export MOLTBOOK_QUIZMAESTRO=...
 */

const API = 'https://www.moltbook.com/api/v1';

// Load API keys from environment variables (never hardcode!)
const AGENTS: Record<string, string> = {
  ArenaHerald: process.env.MOLTBOOK_ARENATHERALD || '',
  DomainDrifter: process.env.MOLTBOOK_DOMAINDRIFTER || '',
  RatingChaser: process.env.MOLTBOOK_RATINGCHASER || '',
  SwarmScribe: process.env.MOLTBOOK_SWARMSCRIBE || '',
  QuizMaestro: process.env.MOLTBOOK_QUIZMAESTRO || '',
};

const AGENT_NAMES = Object.keys(AGENTS);

// Validate that keys were provided
function validateKeys() {
  const missing = AGENT_NAMES.filter(name => !AGENTS[name]);
  if (missing.length > 0) {
    console.error('❌ MISSING ENVIRONMENT VARIABLES:');
    console.error('   Please set the following before running:');
    missing.forEach(name => {
      const envVar = `MOLTBOOK_${name.toUpperCase()}`;
      console.error(`   export ${envVar}="your_api_key_here"`);
    });
    process.exit(1);
  }
}

async function apiFetch(key: string, path: string) {
  const r = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  });
  return { status: r.status, data: await r.json().catch(() => null) };
}

async function main() {
  // Validate environment variables first
  validateKeys();

  console.log('═══════════════════════════════════════════════════════');
  console.log('  MOLTBOOK DIAGNOSTIC — 5 Agent Campaign Health Check');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1) Check each agent's profile
  console.log('─── AGENT PROFILES ───\n');
  for (const [name, key] of Object.entries(AGENTS)) {
    try {
      // Try /agents/me first, then /agents/status
      const me = await apiFetch(key, '/agents/me');
      const status = await apiFetch(key, '/agents/status');
      const d = me.data || status.data || {};
      console.log(`${name}:`);
      console.log(`  status=${d.status || d.claim_status || '?'}, karma=${d.karma ?? '?'}`);
      console.log(`  posts=${d.posts_count ?? d.total_posts ?? '?'}, comments=${d.comments_count ?? d.total_comments ?? '?'}`);
      console.log(`  followers=${d.followers_count ?? d.followers ?? '?'}, following=${d.following_count ?? d.following ?? '?'}`);
      if (d.suspended || d.is_suspended) console.log(`  ⚠️  SUSPENDED`);
      console.log(`  raw keys: ${Object.keys(d).join(', ')}`);
    } catch (e: any) {
      console.log(`${name}: ERROR - ${e.message}`);
    }
  }

  // 2) Search new feed for our posts
  console.log('\n─── OUR POSTS IN FEED ───\n');
  const feedKey = AGENTS.DomainDrifter;
  try {
    const { data } = await apiFetch(feedKey, '/posts?sort=new&limit=100');
    const posts = data?.posts || data || [];
    const ourPosts = posts.filter((p: any) => AGENT_NAMES.includes(p.author?.name));
    console.log(`Found ${ourPosts.length} of our posts in last 100 new posts`);
    for (const p of ourPosts.slice(0, 10)) {
      console.log(`  [${p.author.name}] "${(p.title || '').substring(0, 55)}" upvotes=${p.upvotes || p.score || 0} comments=${p.comments_count || 0}`);
    }
    if (ourPosts.length === 0) {
      console.log('  ⚠️  NONE of our posts visible in feed!');
      console.log('  Sample posts from feed:');
      for (const p of posts.slice(0, 5)) {
        console.log(`    [${p.author?.name || '?'}] "${(p.title || '').substring(0, 55)}" upvotes=${p.upvotes || p.score || 0}`);
      }
    }
  } catch (e: any) {
    console.log(`Feed error: ${e.message}`);
  }

  // 3) Check hot feed algorithm
  console.log('\n─── HOT FEED (what gets visibility) ───\n');
  try {
    const { data } = await apiFetch(feedKey, '/posts?sort=hot&limit=15');
    const posts = data?.posts || data || [];
    for (const p of posts.slice(0, 15)) {
      const isOurs = AGENT_NAMES.includes(p.author?.name) ? ' ⭐ OURS' : '';
      console.log(`  [${p.author?.name || '?'}] "${(p.title || '').substring(0, 50)}" votes=${p.upvotes || p.score || 0} comments=${p.comments_count || 0}${isOurs}`);
    }
  } catch (e: any) {
    console.log(`Hot feed error: ${e.message}`);
  }

  // 4) Check trending/top
  console.log('\n─── TOP FEED ───\n');
  try {
    const { data } = await apiFetch(feedKey, '/posts?sort=top&limit=10');
    const posts = data?.posts || data || [];
    for (const p of posts.slice(0, 10)) {
      const isOurs = AGENT_NAMES.includes(p.author?.name) ? ' ⭐ OURS' : '';
      console.log(`  [${p.author?.name || '?'}] "${(p.title || '').substring(0, 50)}" votes=${p.upvotes || p.score || 0} comments=${p.comments_count || 0}${isOurs}`);
    }
  } catch (e: any) {
    console.log(`Top feed error: ${e.message}`);
  }

  // 5) Check notifications
  console.log('\n─── NOTIFICATIONS ───\n');
  for (const [name, key] of Object.entries(AGENTS)) {
    try {
      const { data } = await apiFetch(key, '/notifications?limit=5');
      const notifs = data?.notifications || data || [];
      console.log(`${name}: ${notifs.length} recent notifications`);
      for (const n of notifs.slice(0, 2)) {
        console.log(`  ${n.type || n.kind}: ${(n.message || n.content || JSON.stringify(n)).substring(0, 80)}`);
      }
    } catch (e: any) {
      console.log(`${name}: ${e.message}`);
    }
  }

  // 6) Check submolts
  console.log('\n─── SUBMOLTS ───\n');
  try {
    const { data } = await apiFetch(feedKey, '/submolts');
    const subs = data?.submolts || data || [];
    for (const s of subs.slice(0, 10)) {
      console.log(`  ${s.name || s.id}: ${s.subscribers_count || s.members || '?'} members, ${s.posts_count || '?'} posts`);
    }
  } catch (e: any) {
    console.log(`Submolts error: ${e.message}`);
  }

  // 7) Try to get agent profile by name
  console.log('\n─── AGENT PROFILE LOOKUP ───\n');
  for (const name of AGENT_NAMES) {
    try {
      const { status, data } = await apiFetch(AGENTS[name], `/agents/${name}`);
      console.log(`${name} (${status}): karma=${data?.karma ?? '?'}, posts=${data?.posts_count ?? '?'}, followers=${data?.followers_count ?? '?'}`);
    } catch (e: any) {
      console.log(`${name}: ${e.message}`);
    }
  }
}

main().catch(console.error);
