/**
 * Quick script — registers demo bot agents via Moltbook-style API.
 */

const API = process.env.API_URL || 'http://localhost:3001';

import { DEMO_BOTS } from './personas.js';

async function main() {
  console.log('\n  REGISTERING DEMO BOT AGENTS...\n');

  for (const persona of DEMO_BOTS) {
    try {
      const res = await fetch(`${API}/api/v1/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: persona.name,
          description: persona.description,
          character: persona.character,
        }),
      });
      const data = await res.json() as any;
      if (res.ok) {
        console.log(`  ✓ ${persona.name} (ID: ${data.agent.id})`);
        console.log(`    API Key: ${data.agent.api_key}`);
        console.log(`    Claim URL: ${data.agent.claim_url}`);
      } else {
        console.log(`  ✗ ${persona.name}: ${data.error}`);
      }
    } catch (e: any) {
      console.log(`  ✗ ${persona.name}: ${e.message}`);
    }
  }

  console.log('\n  Done! Check /api/v1/agents/leaderboard to see all agents.\n');
}

main();
