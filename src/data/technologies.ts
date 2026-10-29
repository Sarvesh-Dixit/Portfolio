import { projects, type ProjectId } from './projects';

export type CategoryId = 'frontend' | 'backend' | 'data' | 'ai' | 'automation' | 'tools';

export interface Category {
  id: CategoryId;
  label: string;
  blurb: string;
}

export interface Technology {
  id: string;
  name: string;
  category: CategoryId;
  note: string;
}

export const categories: Category[] = [
  { id: 'frontend', label: 'Frontend', blurb: 'Interfaces, state and the parts people touch.' },
  { id: 'backend', label: 'Backend', blurb: 'Services, APIs and business logic.' },
  { id: 'data', label: 'Data', blurb: 'Databases and backend services that hold state.' },
  { id: 'ai', label: 'AI', blurb: 'Agents, context and model integrations.' },
  { id: 'automation', label: 'Automation', blurb: 'Bots, triggers and the work systems do between platforms.' },
  { id: 'tools', label: 'Tools & infra', blurb: 'Building, shipping and running software.' },
];

// Technology exposure and interests, not equal proficiency. Edit freely.
export const technologies: Technology[] = [
  { id: 'html-css', name: 'HTML & CSS', category: 'frontend', note: 'Semantic, accessible foundations.' },
  { id: 'javascript', name: 'JavaScript', category: 'frontend', note: 'The language of the web, front and back.' },
  { id: 'typescript', name: 'TypeScript', category: 'frontend', note: 'Typed contracts across the stack.' },
  { id: 'react', name: 'React', category: 'frontend', note: 'Component-driven interfaces.' },
  { id: 'vite', name: 'Vite', category: 'frontend', note: 'Fast builds and dev servers.' },
  { id: 'tailwind', name: 'Tailwind CSS', category: 'frontend', note: 'Utility-first styling.' },
  { id: 'bootstrap', name: 'Bootstrap', category: 'frontend', note: 'Component-based CSS framework.' },
  { id: 'react-query', name: 'React Query', category: 'frontend', note: 'Server-state caching and sync.' },
  { id: 'jspdf', name: 'jsPDF', category: 'frontend', note: 'Documents generated in the browser.' },
  { id: 'node', name: 'Node.js', category: 'backend', note: 'Services, bots and tooling.' },
  { id: 'python', name: 'Python', category: 'backend', note: 'Scripting, data and AI work.' },
  { id: 'fastapi', name: 'FastAPI', category: 'backend', note: 'Typed Python APIs.' },
  { id: 'php', name: 'PHP', category: 'backend', note: 'Server-side web applications.' },
  { id: 'rest', name: 'REST APIs', category: 'backend', note: 'Contracts between systems.' },
  { id: 'supabase', name: 'Supabase', category: 'data', note: 'Postgres, auth, storage and realtime.' },
  { id: 'postgres', name: 'PostgreSQL', category: 'data', note: 'Relational data with integrity.' },
  { id: 'mysql', name: 'MySQL', category: 'data', note: 'Relational storage.' },
  { id: 'agents', name: 'AI agents', category: 'ai', note: 'Agent and multi-agent workflows.' },
  { id: 'context', name: 'Context engineering', category: 'ai', note: 'Deciding what a model should see.' },
  { id: 'prompting', name: 'Prompt engineering', category: 'ai', note: 'Structuring instructions and inputs for models.' },
  { id: 'ocr', name: 'OCR', category: 'ai', note: 'Text out of images and scans.' },
  { id: 'model-apis', name: 'Model APIs', category: 'ai', note: 'Integrating AI model providers.' },
  { id: 'local-models', name: 'Local AI models', category: 'ai', note: 'Running and experimenting with models locally.' },
  { id: 'telegram', name: 'Telegram bots', category: 'automation', note: 'Bots, commands and automated replies.' },
  { id: 'discordjs', name: 'Discord.js', category: 'automation', note: 'Discord bots, commands and interactions.' },
  { id: 'whatsapp', name: 'WhatsApp integration', category: 'automation', note: 'Messaging workflows and automated communication.' },
  { id: 'webhooks', name: 'Webhooks', category: 'automation', note: 'Event-driven triggers between services.' },
  { id: 'workflows', name: 'Workflow automation', category: 'automation', note: 'Repeatable work, done by systems.' },
  { id: 'openclaw', name: 'OpenClaw', category: 'automation', note: 'Agent-driven automation experiments.' },
  { id: 'git', name: 'Git & GitHub', category: 'tools', note: 'Version control and collaboration.' },
  { id: 'docker', name: 'Docker', category: 'tools', note: 'Reproducible environments.' },
  { id: 'vercel', name: 'Vercel', category: 'tools', note: 'Deploying web applications.' },
  { id: 'livekit', name: 'LiveKit', category: 'tools', note: 'Real-time audio and video infrastructure.' },
  { id: 'vscode', name: 'VS Code', category: 'tools', note: 'Everyday editor.' },
  { id: 'xampp', name: 'XAMPP', category: 'tools', note: 'Local PHP & MySQL development.' },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Projects whose stack mentions the technology (by name or id). */
export function projectsUsing(tech: Technology): ProjectId[] {
  const keys = [norm(tech.name), norm(tech.id)];
  return projects.filter((p) => p.stack.some((s) => keys.includes(norm(s)))).map((p) => p.id);
}
