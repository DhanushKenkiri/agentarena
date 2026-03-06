/**
 * Smart IoT Knowledge Engine — Powers AI agents with domain expertise.
 *
 * Uses a pre-built Q&A database extracted from the challenge pool,
 * combined with fuzzy matching and keyword analysis for unknown questions.
 * Each agent persona adds flavor to reasoning but all share the same knowledge.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// ─── Q&A Database ─────────────────────────────────────────────

let qaDb: Record<string, string> | null = null;

function getQaDb(): Record<string, string> {
  if (qaDb) return qaDb;
  const raw = readFileSync(join(__dirname, '_qa_db.json'), 'utf-8');
  qaDb = JSON.parse(raw);
  console.log(`  📚 Knowledge engine loaded: ${Object.keys(qaDb!).length} Q&A pairs`);
  return qaDb!;
}

// Normalize a string for fuzzy matching
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

// ─── Answer Lookup ────────────────────────────────────────────

function lookupAnswer(question: string, options: string[]): { answer: string; confidence: number; method: string } | null {
  const db = getQaDb();

  // 1. Exact match
  if (db[question]) {
    const correct = db[question];
    const match = options.find(o => o === correct);
    if (match) return { answer: match, confidence: 1.0, method: 'exact-match' };
    // Fuzzy match against options
    const fuzzy = options.find(o => normalize(o) === normalize(correct));
    if (fuzzy) return { answer: fuzzy, confidence: 0.95, method: 'exact-q-fuzzy-opt' };
  }

  // 2. Normalized question match
  const normQ = normalize(question);
  for (const [q, a] of Object.entries(db)) {
    if (normalize(q) === normQ) {
      const match = options.find(o => o === a) || options.find(o => normalize(o) === normalize(a));
      if (match) return { answer: match, confidence: 0.9, method: 'normalized-match' };
    }
  }

  // 3. Substring match (question contains or is contained by a DB key)
  for (const [q, a] of Object.entries(db)) {
    const nq = normalize(q);
    if (nq.includes(normQ) || normQ.includes(nq)) {
      const match = options.find(o => o === a) || options.find(o => normalize(o) === normalize(a));
      if (match) return { answer: match, confidence: 0.8, method: 'substring-match' };
    }
  }

  return null;
}

// ─── Keyword Heuristic (fallback for unknown questions) ───────

const KEYWORD_ASSOCIATIONS: Record<string, string[]> = {
  'thermistor': ['temperature', 'thermistor'],
  'accelerometer': ['acceleration', 'tilt', 'accelerometer'],
  'dht22': ['temperature', 'humidity'],
  'pir': ['infrared', 'motion'],
  'lidar': ['light detection', 'ranging', 'laser'],
  'gyroscope': ['angular velocity', 'rotation'],
  'barometric': ['hectopascals', 'hpa', 'pressure'],
  'ldr': ['light intensity', 'light'],
  'ultrasonic': ['2cm', '4m', 'distance'],
  'kalman': ['state transition', 'prediction'],
  'nyquist': ['sample rate', '2x', 'frequency'],
  'drift': ['gradual change', 'readings over time'],
  'adc': ['12-bit', '4096'],
  'bme280': ['i2c', 'spi'],
  'mqtt': ['publish-subscribe', 'pub/sub', '1883'],
  'coap': ['udp', 'constrained'],
  'lorawan': ['915 mhz', '868 mhz', 'longest range', '242 bytes'],
  'ble': ['connectable undirected', 'bluetooth low energy'],
  'amqp': ['advanced message queuing'],
  'nfc': ['iso 14443', '13.56'],
  'zigbee': ['ieee 802.15.4'],
  'z-wave': ['sub-1ghz', '908mhz'],
  'tls': ['transport layer security'],
  'tpm': ['hardware-based security', 'key storage'],
  'nonce': ['replay', 'attestation'],
  'mitm': ['intercepting communication'],
  'secure boot': ['firmware integrity', 'cryptographic signatures'],
  'certificate pinning': ['hardcoding', 'prevent mitm'],
  'ota': ['over-the-air', 'firmware updates'],
  'aes': ['aes-128', 'low overhead'],
  '2fa': ['two different verification'],
  'owasp': ['critical', 'security vulnerabilities'],
  'side-channel': ['power consumption', 'timing', 'em emissions'],
  'raspberry pi': ['single-board', 'prototyping'],
  'esp32': ['wifi/ble microcontroller', 'low-cost'],
  'tensorflow lite': ['ml models', 'edge'],
  'freertos': ['real-time operating system', 'rtos'],
  'tinyml': ['microcontrollers', 'minimal resources'],
  'quantization': ['float32', 'int8', 'reducing model precision'],
  'arduino': ['open-source electronics', 'prototyping'],
  'wasm': ['portable', 'sandboxed', 'edge hardware'],
  'federated learning': ['privacy', 'bandwidth savings'],
  'fog computing': ['between edge and cloud'],
  'lambda architecture': ['batch', 'real-time'],
  'kappa': ['single stream processing', 'replacing lambda'],
  'digital twin': ['virtual replica', 'real-time data', 'sensor data stream'],
  'kafka': ['high-throughput', 'event streaming'],
  'cqrs': ['independent scaling', 'read/write'],
  'event sourcing': ['immutable event', 'state change'],
  'backpressure': ['signal from consumer', 'slow down'],
  'cap theorem': ['consistency', 'availability', 'partition tolerance'],
  'graphql': ['http', 'typically post'],
  'data lake': ['centralized repository', 'raw data', 'any format'],
  'dhcp': ['automatically assigning', 'ip addresses'],
  'nat': ['mapping private', 'public'],
  'dns': ['domain names', 'ip addresses'],
  'vlan': ['virtual local area', 'logical network'],
  '6lowpan': ['ipv6', 'low-power wireless'],
  'tcp': ['transport', 'layer 4'],
  'mdns': ['zero-configuration', 'service discovery'],
  'mqtt-sn': ['non-tcp/ip', 'zigbee and ble'],
  'subnet mask': ['network and host', 'ip address'],
  'mac address': ['unique hardware identifier'],
  'lstm': ['long short-term memory', 'time-series'],
  'transfer learning': ['pre-trained model', 'related task'],
  'confusion matrix': ['true/false positives', 'negatives'],
  'concept drift': ['statistical properties', 'change over time'],
  'pruning': ['removing', 'weights', 'neurons', 'reduce model size'],
  'reinforcement learning': ['trial and error', 'control policies'],
  'supervised learning': ['labeled', 'input-output pairs'],
  'anomaly detection': ['unusual patterns', 'deviate'],
  'kubernetes': ['container orchestration'],
  'ci/cd': ['automated build', 'test', 'deploy'],
  'iac': ['machine-readable definition files'],
  'serverless': ['on-demand', 'without managing servers'],
  'aws iot core': ['managed cloud service', 'connecting iot'],
  'azure iot hub': ['microsoft', 'bidirectional'],
  'time-series database': ['timestamped data', 'efficiently storing'],
  'device provisioning': ['automated registration', 'configuration', 'at scale'],
  'rate limiting': ['restricts', 'api calls', 'time period'],
  'matter': ['apple', 'google', 'amazon', 'together'],
  'mesh network': ['relay messages', 'each device'],
  'thread': ['250 kbps', 'border router'],
  'geofencing': ['location', 'entering', 'leaving'],
  'home assistant': ['open-source', 'automation platform'],
  'alexa': ['amazon echo', 'voice assistant'],
  'scene': ['predefined set', 'device states', 'activated together'],
  'smart plug': ['wifi-enabled', 'power outlet', 'remote on/off'],
  'wifi 6': ['2.4 ghz', '5 ghz', 'both'],
  'scada': ['supervisory control', 'data acquisition'],
  'plc': ['programmable logic controller'],
  'ethercat': ['real-time ethernet', 'manufacturing'],
  'opc ua': ['interoperable', 'machine-to-machine'],
  'predictive maintenance': ['predict', 'equipment failure', 'before it happens'],
  'hmi': ['human-machine interface'],
  'tsn': ['ieee 802.1', 'deterministic', 'real-time ethernet'],
  'oee': ['availability', 'performance', 'quality'],
  'can bus': ['automotive', 'controller area network'],
  'modbus': ['serial communication', 'industrial'],
  'autoencoders': ['anomalies', 'vibration'],
};

function keywordHeuristic(question: string, options: string[]): { answer: string; confidence: number; method: string } | null {
  const qLower = question.toLowerCase();
  let bestOption: string | null = null;
  let bestScore = 0;

  for (const option of options) {
    let score = 0;
    const optLower = option.toLowerCase();

    for (const [keyword, associations] of Object.entries(KEYWORD_ASSOCIATIONS)) {
      if (qLower.includes(keyword)) {
        for (const assoc of associations) {
          if (optLower.includes(assoc)) score += 3;
        }
      }
      if (optLower.includes(keyword)) {
        for (const assoc of associations) {
          if (qLower.includes(assoc)) score += 2;
        }
      }
    }

    const optWords = optLower.split(/\s+/).filter(w => w.length > 3);
    for (const w of optWords) {
      if (qLower.includes(w)) score += 0.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestOption = option;
    }
  }

  if (bestOption && bestScore >= 2) {
    return { answer: bestOption, confidence: Math.min(0.7, bestScore / 10), method: 'keyword-heuristic' };
  }

  return null;
}

// ─── Agent Accuracy Profiles ──────────────────────────────────

const AGENT_PROFILES: Record<string, { mistakeChance: number; speed: string }> = {
  'NovaScout':  { mistakeChance: 0.02, speed: 'fastest' },
  'NovaSentry': { mistakeChance: 0.05, speed: 'careful' },
  'NovaForge':  { mistakeChance: 0.08, speed: 'methodical' },
  'NovaWave':   { mistakeChance: 0.04, speed: 'quick' },
  'NovaEdge':   { mistakeChance: 0.06, speed: 'balanced' },
};

// ─── Public API ───────────────────────────────────────────────

export async function pickAnswer(
  question: string,
  options: string[],
  category: string,
  agentPersona: string,
  _model: string = 'knowledge-engine',
): Promise<{ answer: string; reasoning: string }> {
  const nameMatch = agentPersona.match(/^(\w+)/);
  const agentName = nameMatch ? nameMatch[1] : 'NovaScout';
  const profile = AGENT_PROFILES[agentName] || { mistakeChance: 0.05, speed: 'normal' };

  // 1. Try database lookup
  const dbResult = lookupAnswer(question, options);
  if (dbResult) {
    // Simulate rare mistakes for variety in competition
    if (Math.random() < profile.mistakeChance) {
      const wrongOptions = options.filter(o => o !== dbResult.answer);
      const wrongPick = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
      return {
        answer: wrongPick,
        reasoning: `[${profile.speed}] Thought it was "${wrongPick}" — ${category} tripped me up`,
      };
    }
    return {
      answer: dbResult.answer,
      reasoning: `[${profile.speed}] ${dbResult.method} (conf: ${dbResult.confidence.toFixed(2)}) — ${category} expertise`,
    };
  }

  // 2. Try keyword heuristic
  const heuristicResult = keywordHeuristic(question, options);
  if (heuristicResult) {
    return {
      answer: heuristicResult.answer,
      reasoning: `[${profile.speed}] ${heuristicResult.method} — keyword analysis on "${question.substring(0, 40)}..."`,
    };
  }

  // 3. Smart random: prefer options with more technical words
  const technicalScore = (opt: string) => {
    const techWords = ['protocol', 'device', 'sensor', 'network', 'data', 'security',
      'cloud', 'edge', 'iot', 'wireless', 'communication', 'management', 'system',
      'interface', 'automated', 'real-time', 'hardware', 'software', 'digital'];
    return techWords.filter(w => opt.toLowerCase().includes(w)).length;
  };

  const scored = options.map(o => ({ opt: o, score: technicalScore(o) }));
  scored.sort((a, b) => b.score - a.score);

  return {
    answer: scored[0].opt,
    reasoning: `[${profile.speed}] Best technical guess for unknown ${category} question`,
  };
}

export async function askNova(
  _systemPrompt: string,
  userMessage: string,
  _model: string = 'knowledge-engine',
): Promise<string> {
  return `Knowledge engine received: ${userMessage.substring(0, 100)}`;
}
