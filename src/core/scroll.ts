import Lenis from 'lenis';
import { bezier, clamp, damp, lerp, ticker } from './ticker';
import { env } from './state';
import { RANGES, rangeById, rangeIndexAt, type SectionId } from '../data/sections';

/** Live scroll state, read every frame by GL and the section runtime. */
export const scrollState = {
  px: 0,
  /** Scroll position in viewport heights. */
  s: 0,
  vh: window.innerHeight,
  /** Smoothed, normalised velocity (-1…1). */
  velocity: 0,
};

/** 0→1→0 while a long-distance jump is in flight (lens transition). */
export const jumpState = { amount: 0 };

let lenis: Lenis | null = null;
const navEase = bezier(0.48, 0.09, 0.22, 1);

export function initScroll() {
  history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  if (!env.reduced) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.9 });
    lenis.stop();
    ticker.add((t) => lenis!.raf(t * 1000));
  } else {
    document.documentElement.style.overflow = 'hidden';
  }

  let lastPx = 0;
  ticker.add((_t, dt) => {
    const px = lenis ? lenis.scroll : window.scrollY;
    const raw = lenis ? lenis.velocity : (px - lastPx) / Math.max(dt * 60, 0.001);
    lastPx = px;
    scrollState.px = px;
    scrollState.s = px / scrollState.vh;
    const target = env.reduced ? 0 : clamp(raw / 45, -1, 1);
    scrollState.velocity = lerp(scrollState.velocity, target, damp(8, dt));
  });
}

export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  } else {
    document.documentElement.style.overflow = locked ? 'hidden' : '';
  }
}

export function resizeScroll() {
  lenis?.resize();
}

/** Scroll target for a section: the moment its stage is fully pinned. */
function targetFor(id: SectionId) {
  return id === 'hero' ? 0 : rangeById[id].start * scrollState.vh + 2;
}

/**
 * Neighbouring sections glide there; far jumps run a lens transition: distort
 * and fade out, jump instantly, then resolve on the destination.
 */
export function goTo(id: SectionId, opts: { focus?: boolean } = {}) {
  const target = targetFor(id);
  const from = rangeIndexAt(scrollState.s + 0.5);
  const to = RANGES.findIndex((r) => r.id === id);
  const done = () => {
    if (opts.focus) {
      const h = document.querySelector<HTMLElement>(`#${id} [data-focus]`);
      h?.focus({ preventScroll: true });
    }
  };

  if (!lenis) {
    window.scrollTo({ top: target, behavior: 'auto' });
    done();
    return;
  }
  if (Math.abs(to - from) <= 1) {
    lenis.scrollTo(target, { duration: 1.2, easing: navEase, lock: true, onComplete: done });
    return;
  }
  runJump(() => {
    lenis!.scrollTo(target, { immediate: true, force: true });
    done();
  });
}

let jumping = false;
function runJump(atMidpoint: () => void) {
  if (jumping) return;
  jumping = true;
  lenis?.stop();
  const inDur = 0.55;
  const outDur = 0.7;
  let t = 0;
  let jumped = false;
  const off = ticker.add((_time, dt) => {
    t += dt;
    if (t < inDur) {
      jumpState.amount = navEase(t / inDur);
    } else {
      if (!jumped) {
        jumped = true;
        lenis?.start();
        atMidpoint();
      }
      const k = (t - inDur) / outDur;
      jumpState.amount = 1 - navEase(clamp(k));
      if (k >= 1) {
        jumpState.amount = 0;
        jumping = false;
        off();
      }
    }
    document.documentElement.style.setProperty('--jump', jumpState.amount.toFixed(3));
  });
}
