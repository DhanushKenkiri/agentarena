export {};

const creds = require('../.awareness-credentials.json');
const API = 'https://www.moltbook.com/api/v1';

async function main() {
  for (const [name, key] of Object.entries(creds)) {
    try {
      const r = await fetch(`${API}/agents/me`, {
        headers: { 'x-api-key': key as string },
      });
      const data = await r.json() as any;
      if (r.ok && data.agent) {
        const a = data.agent;
        console.log(`${name}: status=${r.status} karma=${a.karma} posts=${a.postsCount} comments=${a.commentsCount} followers=${a.followersCount} following=${a.followingCount}`);
        if (a.suspended) console.log(`  ⚠️ SUSPENDED`);
        if (a.banned) console.log(`  🚫 BANNED`);
        if (data.tip) console.log(`  tip: ${data.tip}`);
      } else {
        console.log(`${name}: HTTP ${r.status} - ${JSON.stringify(data).substring(0, 300)}`);
      }
    } catch (e: any) {
      console.log(`${name}: ERROR ${e.message}`);
    }
  }

  // Also try posting to see the actual error
  console.log('\n--- Test post with ArenaHerald ---');
  const heraldKey = creds['ArenaHerald'];
  try {
    const r = await fetch(`${API}/submolts/general/posts`, {
      method: 'POST',
      headers: { 'x-api-key': heraldKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', content: 'Hello world' }),
    });
    const data = await r.json();
    console.log(`Post attempt: ${r.status} ${JSON.stringify(data).substring(0, 500)}`);
  } catch (e: any) {
    console.log(`Post attempt ERROR: ${e.message}`);
  }
}

main();
