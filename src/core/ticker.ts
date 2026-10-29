/** Time in seconds since start, frame delta in seconds (clamped). */
export type TickFn = (time: number, dt: number) => void;

const subs: TickFn[] = [];
let raf = 0;
let last = 0;

function loop(now: number) {
  raf = requestAnimationFrame(loop);
  const t = now / 1000;
  const dt = last ? Math.min(0.05, t - last) : 1 / 60;
  last = t;
  for (const fn of subs) fn(t, dt);
}

/** One rAF for the whole site. Subscribers run in registration order. */
export const ticker = {
  add(fn: TickFn) {
    subs.push(fn);
    return () => {
      const i = subs.indexOf(fn);
      if (i >= 0) subs.splice(i, 1);
    };
  },
  start() {
    if (!raf) raf = requestAnimationFrame(loop);
  },
};

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Frame-rate independent smoothing factor. */
export const damp = (lambda: number, dt: number) => 1 - Math.exp(-lambda * dt);
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** CSS-style cubic-bezier easing, solved with Newton iterations. */
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const a = (a1: number, a2: number) => 1 - 3 * a2 + 3 * a1;
  const b = (a1: number, a2: number) => 3 * a2 - 6 * a1;
  const c = (a1: number) => 3 * a1;
  const calc = (t: number, a1: number, a2: number) => ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t;
  const slope = (t: number, a1: number, a2: number) => 3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1);
  return (x: number) => {
    if (x <= 0 || x >= 1) return clamp(x);
    let t = x;
    for (let i = 0; i < 8; i++) {
      const s = slope(t, x1, x2);
      if (Math.abs(s) < 1e-6) break;
      t -= (calc(t, x1, x2) - x) / s;
    }
    return calc(clamp(t), y1, y2);
  };
}
