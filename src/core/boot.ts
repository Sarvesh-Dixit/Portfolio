import { RANGES, type SectionId } from '../data/sections';
import { intro, loading } from './loading';
import { initPointer } from './pointer';
import { goTo, initScroll, lockScroll, resizeScroll, scrollState } from './scroll';
import { initSectionRuntime } from './sectionRuntime';
import { env, glStore, phaseStore } from './state';
import { ticker } from './ticker';

const root = document.documentElement;
let started = false;

/** Boot order: scroll + pointer → loading tasks → intro camera move → ready. */
export function boot(canvas: HTMLCanvasElement) {
  if (started) return;
  started = true;

  root.classList.toggle('is-reduced', env.reduced);
  root.classList.toggle('is-touch', env.touch);
  syncViewport(true);
  window.addEventListener('resize', () => syncViewport(false));

  initScroll();
  initPointer();
  initSectionRuntime();

  loading.add('fonts');
  loading.add('gl');
  for (const r of RANGES) {
    loading.add(`build:${r.id}`);
    loading.add(`warm:${r.id}`);
  }

  const fonts = Promise.all([
    document.fonts.load('400 32px "VT323"'),
    document.fonts.load('400 64px "Instrument Serif"'),
    document.fonts.load('400 16px "Geist"'),
  ]);
  Promise.race([fonts, new Promise((r) => setTimeout(r, 3000))])
    .catch(() => undefined)
    .finally(() => loading.done('fonts'));

  ticker.add((_t, dt) => {
    loading.tick(dt, env.reduced ? 0.4 : 1.9);
    intro.tick();
  });

  import('../gl/Stage')
    .then(({ createStage }) => createStage(canvas))
    .then(() => glStore.set('ok'))
    .catch((err) => {
      console.warn('[gl] falling back to static backgrounds:', err);
      glStore.set('failed');
      root.classList.add('no-gl');
      for (const r of RANGES) {
        loading.done(`build:${r.id}`);
        loading.done(`warm:${r.id}`);
      }
    })
    .finally(() => loading.done('gl'));

  loading.onComplete(startIntro);
  ticker.start();
}

function startIntro() {
  const duration = env.reduced || glStore.get() !== 'ok' ? 0 : loading.skipped ? 1.3 : 2.6;
  root.style.setProperty('--intro-dur', `${duration}s`);
  root.dataset.phase = 'intro';
  phaseStore.set('intro');
  intro.start(duration, () => {
    root.dataset.phase = 'ready';
    phaseStore.set('ready');
    lockScroll(false);
    followHash();
  });
}

export function skipIntro() {
  if (!loading.complete) loading.skip();
  else intro.finish();
}

const HASH_ALIASES: Record<string, SectionId> = { work: 'illuxus', projects: 'illuxus' };

function followHash() {
  const key = decodeURIComponent(location.hash.slice(1));
  if (!key) return;
  const id = (HASH_ALIASES[key] ?? RANGES.find((r) => r.id === key)?.id) as SectionId | undefined;
  if (id) goTo(id);
}

let lastW = 0;
let lastH = 0;
/** Mobile URL bars resize constantly; only re-measure on meaningful changes. */
function syncViewport(force: boolean) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (!force && w === lastW && Math.abs(h - lastH) < 150) return;
  lastW = w;
  lastH = h;
  scrollState.vh = h;
  root.style.setProperty('--vh', `${h / 100}px`);
  resizeScroll();
}
