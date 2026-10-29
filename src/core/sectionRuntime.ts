import { RANGES, rangeIndexAt, stageFor, stickyProgress, type SectionId } from '../data/sections';
import { activeSectionStore } from './state';
import { scrollState } from './scroll';
import { ticker } from './ticker';

/**
 * Pushes scroll-derived values into the DOM without React re-renders:
 * `--p` (sticky progress) and `data-stage` on each section, `--page` on <html>,
 * `.is-active/.is-past` on `[data-step]` children, `.is-in` on `[data-reveal]`.
 */
export function initSectionRuntime() {
  const root = document.documentElement;
  const els = new Map<SectionId, HTMLElement>();
  for (const r of RANGES) {
    const el = document.getElementById(r.id);
    if (el) els.set(r.id, el);
  }
  const lastP = new Map<SectionId, string>();
  const lastStage = new Map<SectionId, number>();
  const total = RANGES[RANGES.length - 1].end - 1;
  let lastPage = '';

  ticker.add(() => {
    const s = scrollState.s;
    for (const r of RANGES) {
      const el = els.get(r.id);
      if (!el || s < r.start - 1.2 || s > r.end + 0.2) continue;
      const p = stickyProgress(r, s);
      const ps = p.toFixed(4);
      if (lastP.get(r.id) !== ps) {
        el.style.setProperty('--p', ps);
        lastP.set(r.id, ps);
      }
      const stage = stageFor(r.id, p);
      if (lastStage.get(r.id) !== stage) {
        lastStage.set(r.id, stage);
        el.dataset.stage = String(stage);
        el.querySelectorAll<HTMLElement>('[data-step]').forEach((n) => {
          const i = Number(n.dataset.step);
          n.classList.toggle('is-active', i === stage);
          n.classList.toggle('is-past', i < stage);
        });
      }
    }
    activeSectionStore.set(RANGES[rangeIndexAt(s + 0.5)].id);
    const page = Math.min(1, s / total).toFixed(4);
    if (page !== lastPage) {
      root.style.setProperty('--page', page);
      lastPage = page;
    }
  });

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.2 },
  );
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
}
