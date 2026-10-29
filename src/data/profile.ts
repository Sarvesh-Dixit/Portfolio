/**
 * Everything personal lives here. Replace the bracketed placeholders.
 * Empty strings hide the matching link in production; in dev they show a
 * reminder chip so nothing ships half-configured.
 */
export const profile = {
  name: 'Sarvesh Dixit',
  role: 'Software developer',
  location: '',
  /** Hero headline, one entry per line. Wrap a word in *asterisks* for italics. */
  headline: ['I engineer the *systems*', 'behind the screen.'],
  intro:
    'I build full-stack applications, AI-powered systems and automation workflows that connect technologies to solve practical problems.',
  statement: [
    'I turn ideas into working software',
    'by combining *engineering*, AI,',
    'automation and *system design*.',
  ],
  bio:
    'I build complete applications, not just static websites: interfaces, backends, databases, API integrations, AI features and the automations that connect them. I focus on systems where different technologies work together to solve a real problem.',
  focus: [
    'Full-stack application development',
    'AI applications & agents',
    'Messaging & workflow automation',
    'API integrations & system architecture',
  ],
  interests: [
    'Multi-agent systems',
    'Context engineering',
    'SaaS products',
    'Developer tools & productivity',
  ],
  philosophy:
    'Understand the problem, design the system, then build, connect and refine it until it works for the people using it.',
  // Real roles only. Leave empty to hide the column.
  experience: [{ period: '6 weeks', role: 'Web Development Intern', org: 'CSISM Technologies' }] as { period: string; role: string; org: string }[],
  availability: '[Availability, e.g. “Open to new projects and collaborations”]',
  contact: {
    email: 'sarveshdixit380@gmail.com',
    linkedin: 'https://www.linkedin.com/in/sarvesh-dixit-475405282',
    github: 'https://github.com/Sarvesh-Dixit',
    other: [] as { label: string; url: string }[],
  },
};

export type Profile = typeof profile;
