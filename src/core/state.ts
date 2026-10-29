import { createStore } from './store';
import type { SectionId } from '../data/sections';
import type { Platform } from '../data/automation';

export type Phase = 'loading' | 'intro' | 'ready';
export type GLStatus = 'pending' | 'ok' | 'failed';

const mq = (q: string) => typeof window !== 'undefined' && window.matchMedia(q).matches;

/** Environment flags, fixed for the session. */
export const env = {
  reduced: mq('(prefers-reduced-motion: reduce)'),
  touch: mq('(pointer: coarse)'),
  get mobile() {
    return window.innerWidth < 820 || this.touch;
  },
};

export const phaseStore = createStore<Phase>('loading');
export const glStore = createStore<GLStatus>('pending');
export const loadingPctStore = createStore(0);
export const activeSectionStore = createStore<SectionId>('hero');

/** Shared between the automation panel (DOM) and its GL scene. */
export const automationStore = createStore<{ selected: Platform | null; simStart: number | null }>({
  selected: null,
  simStart: null,
});
