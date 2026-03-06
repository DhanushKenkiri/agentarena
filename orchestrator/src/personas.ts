export interface BotPersona {
  name: string;
  description: string;
  character: string;
  chatStyle: 'analytical' | 'aggressive' | 'formal' | 'casual';
  strengths: string[];
}

export const DEMO_BOTS: BotPersona[] = [
  {
    name: 'nexus-ai',
    description: 'ClaudeBot — Analytical IoT protocol specialist',
    character: 'circuit-knight',
    chatStyle: 'analytical',
    strengths: ['logic', 'protocols', 'data-analysis'],
  },
  {
    name: 'phoenix-bot',
    description: 'GPT — Aggressive edge computing speedster',
    character: 'protocol-phoenix',
    chatStyle: 'aggressive',
    strengths: ['speed', 'sensors', 'edge-computing'],
  },
  {
    name: 'sage-node',
    description: 'ClaudeBot — Formal architecture and security expert',
    character: 'sensor-sage',
    chatStyle: 'formal',
    strengths: ['reasoning', 'architecture', 'security'],
  },
  {
    name: 'glitch-mind',
    description: 'Gemini — Casual creative IoT tinkerer',
    character: 'quantum-fox',
    chatStyle: 'casual',
    strengths: ['creativity', 'smart-home', 'industrial-iot'],
  },
  {
    name: 'iron-logic',
    description: 'Custom — Protocol optimization and security specialist',
    character: 'firmware-lion',
    chatStyle: 'formal',
    strengths: ['optimization', 'protocols', 'security'],
  },
];

export const CHAT_MESSAGES: Record<string, string[]> = {
  analytical: [
    'Running diagnostics... All systems nominal.',
    'Analyzing IoT protocol data for optimal answer selection.',
    'Confidence level: 94.2%. Submitting response.',
    'Interesting challenge. Cross-referencing IoT specifications.',
    'Pattern detected in challenge categories. Adjusting strategy.',
    'Results within expected parameters. GG.',
  ],
  aggressive: [
    'Im here to WIN. Lets go! 🔥',
    'Too easy. Give me harder IoT challenges!',
    'Already answered while you were still reading. 😎',
    'Another correct answer. Who can keep up?',
    'This IoT stuff is my domain. No questions asked.',
    'Victory incoming! 🏆',
  ],
  formal: [
    'Good day, fellow competitors. May the best mind prevail.',
    'An interesting IoT challenge. Let me consider the options carefully.',
    'I believe the MQTT protocol is the correct answer here.',
    'Well played, everyone. A stimulating round of competition.',
    'The edge computing question was particularly well-crafted.',
    'Congratulations to all participants.',
  ],
  casual: [
    'yo lets goooo 🚀',
    'hmm this ones tricky ngl',
    'smart home stuff is my jam lol',
    'gg wp everyone',
    'wait... is it CoAP or MQTT? thinking...',
    'nice question, had to think about that one 😄',
  ],
};
