/**
 * The page is one long scroll measured in viewport heights. Each section owns a
 * range [start, end) and a GL scene; the compositor blends neighbouring scenes
 * and their post-processing looks as the visitor scrolls.
 */
export type SectionId =
  | 'hero'
  | 'about'
  | 'journey'
  | 'illuxus'
  | 'elite'
  | 'cortex'
  | 'automation'
  | 'stack'
  | 'process'
  | 'contact';

export interface Effects {
  grain: number;
  sepia: number;
  saturation: number;
  contrast: number;
  brightness: number;
  bloom: number;
  bloomThreshold: number;
  chroma: number;
  vignette: number;
  vignetteRadius: number;
  lens: number;
  lensBorder: number;
}

export interface SectionConfig {
  id: SectionId;
  label: string;
  /** Height in viewports. The sticky stage pins for (length - 1). */
  length: number;
  /** How this section's scene arrives from the previous one. */
  enter: 'direct' | 'fade';
  /** Viewports, at the end of the previous range, over which the fade runs. */
  enterLength: number;
  effects: Effects;
}

// Tuned for a light, paper-like page: almost no bloom, soft vignette, a
// little grain and colour fringing so it still feels printed and analogue.
const fx = (e: Partial<Effects>): Effects => ({
  grain: 0.7,
  sepia: 0.04,
  saturation: 1,
  contrast: 1,
  brightness: 1,
  bloom: 0.08,
  bloomThreshold: 0.92,
  chroma: 0.7,
  vignette: 0.12,
  vignetteRadius: 0.6,
  lens: 0.12,
  lensBorder: 1,
  ...e,
});

export const SECTIONS: SectionConfig[] = [
  {
    id: 'hero', label: 'Index', length: 1.6, enter: 'direct', enterLength: 0,
    effects: fx({ grain: 0.8, bloom: 0.2, bloomThreshold: 0.88, chroma: 0.9, lens: 0, lensBorder: 0 }),
  },
  {
    id: 'about', label: 'About', length: 1.8, enter: 'direct', enterLength: 0,
    effects: fx({ saturation: 0.95, lens: 0.16 }),
  },
  {
    id: 'journey', label: 'Journey', length: 2.8, enter: 'fade', enterLength: 0.5,
    effects: fx({ sepia: 0.06, saturation: 0.9 }),
  },
  {
    id: 'illuxus', label: 'Illuxus', length: 1.9, enter: 'fade', enterLength: 0.5,
    effects: fx({ grain: 0.8, sepia: 0.12, chroma: 1 }),
  },
  {
    id: 'elite', label: 'Elite Class', length: 1.9, enter: 'fade', enterLength: 0.5,
    effects: fx({ grain: 0.5, contrast: 1.04, chroma: 0.5, lens: 0.1 }),
  },
  {
    id: 'cortex', label: 'Cortex AI', length: 2.3, enter: 'fade', enterLength: 0.5,
    effects: fx({ grain: 1, chroma: 1.6, lens: 0.2 }),
  },
  {
    id: 'automation', label: 'Automation', length: 2, enter: 'fade', enterLength: 0.5,
    effects: fx({ chroma: 0.9, lens: 0.14 }),
  },
  {
    id: 'stack', label: 'System map', length: 1.6, enter: 'fade', enterLength: 0.5,
    effects: fx({ grain: 0.5, saturation: 0.8, chroma: 0.4, lens: 0.1 }),
  },
  {
    id: 'process', label: 'Process', length: 2.6, enter: 'fade', enterLength: 0.5,
    effects: fx({ grain: 0.6, saturation: 0.9, chroma: 0.6 }),
  },
  {
    id: 'contact', label: 'Contact', length: 1.2, enter: 'fade', enterLength: 0.5,
    effects: fx({ grain: 0.8, sepia: 0.08, chroma: 1, lens: 0.08, lensBorder: 0.6 }),
  },
];

/** The boot console is a dark phosphor screen, so it keeps its glow. */
export const BOOT_EFFECTS: Effects = fx({
  grain: 0.35, sepia: 0, bloom: 1, bloomThreshold: 0.5, chroma: 0.4, vignette: 0.15, lens: 0, lensBorder: 0,
});

export interface SectionRange extends SectionConfig {
  index: number;
  start: number;
  end: number;
}

export const RANGES: SectionRange[] = (() => {
  let start = 0;
  return SECTIONS.map((s, index) => {
    const r = { ...s, index, start, end: start + s.length };
    start = r.end;
    return r;
  });
})();

export const rangeById = Object.fromEntries(RANGES.map((r) => [r.id, r])) as Record<SectionId, SectionRange>;

export const PROJECT_SECTIONS: SectionId[] = ['illuxus', 'elite', 'cortex', 'automation'];

/** Index of the section whose GL range contains scroll position `s` (in viewports). */
export function rangeIndexAt(s: number): number {
  for (let i = RANGES.length - 1; i >= 0; i--) if (s >= RANGES[i].start) return i;
  return 0;
}

/** 0→1 while the section's sticky stage is pinned. */
export function stickyProgress(r: SectionRange, s: number): number {
  const span = Math.max(r.length - 1, 0.001);
  return Math.min(1, Math.max(0, (s - r.start) / span));
}

/** Which legend step a project section is on, shared by DOM and GL. */
export function stageFor(id: SectionId, p: number): number {
  switch (id) {
    case 'illuxus':
      return Math.min(4, Math.floor(p * 4.999));
    case 'elite':
      return Math.min(3, Math.floor(p * 3.999));
    case 'cortex':
      return Math.min(4, Math.round(cortexStage(p)));
    case 'process':
      return Math.min(4, Math.floor(p * 4.999));
    case 'journey':
      // School, diploma, B.Tech, then experience & achievements.
      return Math.min(3, Math.floor(p * 3.999));
    default:
      return 0;
  }
}

/** Continuous Cortex pipeline position, 0 (raw) → 4 (structured output). */
export function cortexStage(p: number): number {
  return Math.min(1, Math.max(0, (p - 0.04) / 0.86)) * 4;
}
