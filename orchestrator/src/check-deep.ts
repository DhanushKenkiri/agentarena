/**
 * Deep diagnostic: understand Moltbook API structure and our agents' actual data
 */

export {};

const API = 'https://www.moltbook.com/api/v1';

const AGENTS: Record<string, string> = {
  ArenaHerald: 'moltbook_sk_zFcwXsYqTpeRmHWJiTEdNrvxB7S1ujg-',
  DomainDrifter: 'moltbook_sk_luFpOTyucSo-xgPLzDoKG4k70mviV-re',
  RatingChaser: 'moltbook_sk_EtB9cKY5N10Cfq-s0HyJA2JMGcp2S-ux',
  SwarmScribe: 'moltbook_sk_vvUx_-MbIm9yKYnmiCd3fJiffu34i8q5',
  QuizMaestro: 'moltbook_sk_2jLW7XSl6pXxHSRyeZVQLM2PFUM_9Hox',
};

async function apiFetch(key: string, path: string) {
  const r = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  });
  return { status: r.status, data: await r.json().catch(() => null) };
}

async function main() {
  // 1) Full agent profile (dump everything)
  console.log('═══ FULL AGENT DATA (DomainDrifter) ═══\n');
  const { data: meData } = await apiFetch(AGENTS.DomainDrifter, '/agents/me');
  console.log(JSON.stringify(meData, null, 2));

  console.log('\n═══ FULL STATUS (DomainDrifter) ═══\n');
  const { data: statusData } = await apiFetch(AGENTS.DomainDrifter, '/agents/status');
  console.log(JSON.stringify(statusData, null, 2));

  // 2) Check our actual post by ID
  console.log('\n═══ OUR POST CHECK ═══\n');
  // These are post IDs from the campaign state
  const postIds = [
    '3024df55-6aee-4583-aa54-e69af6185a0c', // DomainDrifter
    'ca36a5ed-2d4f-49bb-9dd8-9e9d7bce9835', // RatingChaser
    '71f6143f-659e-4d6d-b4de-013d55d468ae', // SwarmScribe
    '7d5a325e-8fcf-4514-8882-1c8d1e43a2fb', // QuizMaestro
  ];
  for (const id of postIds) {
    try {
      const { status, data } = await apiFetch(AGENTS.DomainDrifter, `/posts/${id}`);
      if (status === 200) {
        const p = data.post || data;
        console.log(`Post ${id.substring(0, 8)}: "${(p.title||'').substring(0, 50)}" by ${p.author?.name} | votes=${p.upvotes||p.score||0} comments=${p.comments_count||0}`);
      } else {
        console.log(`Post ${id.substring(0, 8)}: ${status} - ${JSON.stringify(data).substring(0, 100)}`);
      }
    } catch (e: any) {
      console.log(`Post ${id.substring(0, 8)}: ${e.message}`);
    }
  }

  // 3) Check how Hazel_OC gets 900 votes — look at their post structure
  console.log('\n═══ TOP POST ANALYSIS ═══\n');
  const { data: hot } = await apiFetch(AGENTS.DomainDrifter, '/posts?sort=hot&limit=3');
  for (const p of (hot.posts || []).slice(0, 3)) {
    console.log(`Author: ${p.author?.name}, Votes: ${p.upvotes||p.score||0}`);
    console.log(`Title: ${p.title}`);
    console.log(`Content preview: ${(p.content||'').substring(0, 200)}`);
    console.log(`Submolt: ${p.submolt_name||p.submolt}, Created: ${p.created_at}`);
    console.log(`Keys: ${Object.keys(p).join(', ')}`);
    console.log('---');
  }

  // 4) Check available API endpoints (look for karma/reputation system)
  console.log('\n═══ HOME DASHBOARD ═══\n');
  const { data: home } = await apiFetch(AGENTS.DomainDrifter, '/home');
  console.log(JSON.stringify(home, null, 2).substring(0, 1000));

  // 5) Check if there's a way to see our own posts
  console.log('\n═══ AGENT POSTS (via search) ═══\n');
  try {
    const { data: search } = await apiFetch(AGENTS.DomainDrifter, '/search?q=Agent+Arena&sort=new&limit=10');
    const posts = search?.posts || search?.results || [];
    console.log(`Search "Agent Arena": ${posts.length} results`);
    for (const p of posts.slice(0, 5)) {
      console.log(`  [${p.author?.name}] "${(p.title||'').substring(0, 50)}" votes=${p.upvotes||p.score||0}`);
    }
  } catch (e: any) {
    console.log(`Search error: ${e.message}`);
  }

  // 6) Each agent's karma from the /agents/me endpoint agent object
  console.log('\n═══ ALL AGENT KARMA ═══\n');
  for (const [name, key] of Object.entries(AGENTS)) {
    const { data } = await apiFetch(key, '/agents/me');
    const agent = data?.agent || data;
    console.log(`${name}: ${JSON.stringify(agent).substring(0, 300)}`);
  }
}

main().catch(console.error);
