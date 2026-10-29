export type ProjectId = 'illuxus' | 'elite' | 'cortex' | 'automation';

/**
 * live           — deployment verified
 * paused         — built, development currently on hold
 * in-development — actively being built
 * concept        — experiment / exploration
 * unverified     — not yet confirmed; no status badge is shown in production
 */
export type ProjectStatus = 'live' | 'paused' | 'in-development' | 'concept' | 'unverified';

/** Who built it. `null` until confirmed; no label is shown in production. */
export type Ownership = 'personal' | 'collaborative' | 'professional' | null;

export interface Project {
  id: ProjectId;
  index: string;
  name: string;
  /** Former name, shown in the case file. */
  aka?: string;
  category: string;
  projectType: string;
  summary: string;
  targetUsers?: string;
  problem: string;
  solution: string;
  architecture: string[];
  /**
   * Heading for the feature list. Use "Key features" only for verified,
   * shipped functionality; "Scope" or "Planned capabilities" otherwise.
   */
  featuresTitle: string;
  features: string[];
  /** Implementation stack. Names that match technologies.ts link into the system map. */
  stack: string[];
  /** Your role on the project. */
  role: string | null;
  /** Who the project was built for, when it isn't your own. */
  client?: { name: string; owner?: string };
  /** What you personally built. Empty hides the section in production. */
  contributions: string[];
  liveUrl: string | null;
  repoUrl: string | null;
  status: ProjectStatus;
  ownership: Ownership;
  /** Legend shown next to the visualization; its items step with scroll. */
  legend: { title: string; items: string[] };
  /** Shown under the visual when it is an illustration rather than the product itself. */
  note?: string;
}

// TODO(owner): for each project confirm status, ownership, links, stack and
// contributions; then switch featuresTitle to "Key features" for anything
// verified in the live version.
export const projects: Project[] = [
  {
    id: 'illuxus',
    index: '01',
    name: 'Illuxus',
    category: 'Event management platform',
    projectType: 'Full-stack web application',
    summary:
      'A platform for the full lifecycle of an event: creation, registration, attendance and online participation.',
    problem:
      'Organisers juggle separate tools for event pages, registration, ticketing, check-in and online sessions, so data and attendees end up split across them.',
    solution:
      'One connected environment for organisers and attendees, with dashboards, public event pages, ticketing, attendance and real-time webinars.',
    architecture: [
      'React + TypeScript frontend built with Vite and Tailwind CSS',
      'Supabase for data, authentication and storage',
      'React Query for server-state caching and sync',
      'LiveKit for real-time audio and video in webinars',
      'jsPDF for documents generated in the browser',
    ],
    featuresTitle: 'Scope',
    features: [
      'Event creation & management',
      'Event dashboards',
      'Public event pages',
      'Registration & ticketing',
      'Check-in & attendance',
      'Webinars over LiveKit',
      'Embeddable event widgets',
      'Event data management',
    ],
    stack: ['React', 'Vite', 'TypeScript', 'Supabase', 'LiveKit', 'Tailwind CSS', 'React Query', 'jsPDF'],
    role: 'Full-stack lead developer',
    client: { name: 'Biz Millenium', owner: 'Aman Shaikh' },
    contributions: [],
    liveUrl: 'https://illuxus.com',
    repoUrl: null,
    status: 'live',
    ownership: 'professional',
    legend: { title: 'Event lifecycle', items: ['Create', 'Publish', 'Register', 'Check in', 'Go live'] },
  },
  {
    id: 'elite',
    index: '02',
    name: 'Elite Class',
    category: 'Education technology',
    projectType: 'Learning & institute management system',
    summary:
      'An education-management platform that brings an institute’s academic and administrative work into one system.',
    targetUsers: 'Administrators, teachers, students and parents, each with role-specific access.',
    problem:
      'Enrolment, batches, attendance, grades and fees are often tracked in disconnected spreadsheets and tools that drift out of sync.',
    solution:
      'One data model with role-based dashboards, so each role sees and changes only its part, and everyone sees consistent records.',
    architecture: [
      'Role-based access control across admin, teacher, student and parent views',
      'Relational data model linking students, teachers, courses, batches and records',
      'Authentication and per-role authorization',
    ],
    featuresTitle: 'Scope',
    features: [
      'Student management',
      'Teacher & staff management',
      'Course & batch management',
      'Admissions',
      'Attendance tracking',
      'Grade management',
      'Fee management',
      'Academic records',
      'Role-based dashboards',
      'Parent & student access',
    ],
    // TODO(owner): confirm the stack of the version you showcase.
    // Candidates from the brief: React, TypeScript, Supabase, PostgreSQL.
    stack: [],
    role: 'Full-stack developer',
    client: { name: 'Elite Forums', owner: 'Harsh Tambade' },
    contributions: [],
    // https://eliteclass.in returned 503 on 2026-10-29; restore the link once it's back up.
    liveUrl: null,
    repoUrl: null,
    status: 'paused',
    ownership: 'professional',
    legend: { title: 'System layers', items: ['Administration', 'Teachers', 'Courses & batches', 'Students & parents'] },
    note: 'Illustrative structure. No real student data is shown.',
  },
  {
    id: 'cortex',
    index: '03',
    name: 'Cortex AI',
    aka: 'CompressionAI',
    category: 'AI & context engineering',
    projectType: 'AI-powered information processing system',
    summary:
      'Explores how large amounts of information can be extracted, analysed and compressed into compact context for language models.',
    problem:
      'Useful information arrives as long documents, scans and threads. Passing it to a model unprocessed wastes context and buries what matters.',
    solution:
      'A processing pipeline that extracts information, identifies what is relevant, reduces unnecessary context and structures the result for AI workflows.',
    architecture: [
      'Input → extraction → analysis → compression → structuring → output',
      'Agents with separate responsibilities along the pipeline',
      'Configurable model API integrations',
      'Token estimation, with model-to-model comparison as a direction',
    ],
    featuresTitle: 'Core concepts',
    features: [
      'Context compression',
      'OCR & information extraction',
      'Multi-agent processing',
      'Context analysis',
      'Prompt generation',
      'Token estimation',
      'AI model integration',
      'Structured information processing',
    ],
    // TODO(owner): replace with the implementation stack (language, framework, model APIs).
    stack: ['OCR', 'AI agents', 'Context engineering', 'Prompt engineering'],
    role: 'Developer',
    contributions: [],
    liveUrl: 'https://cortex-ai-xi.vercel.app/',
    repoUrl: null,
    status: 'paused',
    ownership: 'personal',
    legend: {
      title: 'Pipeline',
      items: ['Input', 'Extraction', 'Analysis', 'Compression', 'Structured output'],
    },
    note: 'Conceptual visualization of the pipeline, not a live model or a benchmark.',
  },
  {
    id: 'automation',
    index: '04',
    name: 'Automation Systems',
    category: 'Workflow automation & messaging',
    projectType: 'Automation tools, bots & connected systems',
    summary:
      'Bots and workflows that connect WhatsApp, Telegram and Discord to APIs, backend services and AI processing.',
    problem:
      'Repetitive communication work is done by hand, and each messaging platform has its own APIs, events and limits.',
    solution:
      'Treat the platforms as one connected system: triggers from each channel feed shared workflows that call APIs, run logic or AI, and reply on the right platform.',
    architecture: [
      'Event-driven triggers: webhooks, bot commands and scheduled jobs',
      'Shared workflow layer for routing and processing',
      'AI-assisted responses where implemented',
      'Platform-specific adapters for sending replies',
    ],
    featuresTitle: 'Platform work',
    features: [
      'WhatsApp messaging workflows & automated communication',
      'Telegram bots with command handling',
      'Discord bots with commands & interactions (Discord.js)',
      'AI-assisted bot interactions where implemented',
      'Integration with backend services & external APIs',
    ],
    // TODO(owner): keep only what each showcased system uses, and note which
    // integrations use official APIs, third-party libraries, or are experimental.
    stack: ['Node.js', 'JavaScript', 'Discord.js', 'Telegram bots', 'WhatsApp integration', 'Webhooks', 'OpenClaw', 'Local AI models'],
    role: null,
    contributions: [],
    liveUrl: null,
    repoUrl: null,
    status: 'unverified',
    ownership: null,
    legend: { title: 'Channels', items: ['WhatsApp', 'Telegram', 'Discord'] },
    note: 'Interactive illustration. Nothing here sends real messages.',
  },
];

export const projectById = Object.fromEntries(projects.map((p) => [p.id, p])) as Record<ProjectId, Project>;

export const statusLabel: Record<ProjectStatus, string | null> = {
  live: 'Live',
  paused: 'Paused',
  'in-development': 'In development',
  concept: 'Concept',
  unverified: null,
};

export const ownershipLabel: Record<NonNullable<Ownership>, string> = {
  personal: 'Personal project',
  collaborative: 'Collaborative project',
  professional: 'Professional work',
};
