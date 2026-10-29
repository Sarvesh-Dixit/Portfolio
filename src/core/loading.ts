import { loadingPctStore } from './state';

const tasks = new Map<string, boolean>();
const doneCbs: (() => void)[] = [];
const startedAt = performance.now();
let display = 0;
let skipped = false;
let complete = false;

/**
 * Real progress (registered tasks) eased into a displayed value that can't
 * run faster than `minDuration`, so the boot sequence is readable but short.
 */
export const loading = {
  add(name: string) {
    tasks.set(name, false);
  },
  done(name: string) {
    tasks.set(name, true);
  },
  get target() {
    if (!tasks.size) return 0;
    let n = 0;
    tasks.forEach((v) => v && n++);
    return (n / tasks.size) * 100;
  },
  get value() {
    return display;
  },
  get skipped() {
    return skipped;
  },
  get complete() {
    return complete;
  },
  skip() {
    skipped = true;
  },
  onComplete(cb: () => void) {
    if (complete) cb();
    else doneCbs.push(cb);
  },
  tick(dt: number, minDuration: number) {
    if (complete) return;
    const elapsed = (performance.now() - startedAt) / 1000;
    const cap = skipped ? 100 : Math.min(100, (elapsed / minDuration) * 100);
    const target = Math.min(this.target, cap);
    display += (target - display) * (1 - Math.exp(-dt * (skipped ? 18 : 6)));
    if (target - display < 0.35) display = target;
    loadingPctStore.set(Math.floor(display));
    if (this.target >= 100 && display >= 99.9) {
      complete = true;
      display = 100;
      loadingPctStore.set(100);
      doneCbs.splice(0).forEach((cb) => cb());
    }
  },
};

/**
 * Camera pull-back after boot. `t` runs 0→1 over `duration` seconds of wall
 * time, so slow devices skip frames instead of stretching the intro.
 */
export const intro = {
  t: 0,
  duration: 2.6,
  running: false,
  startedAt: 0,
  start(duration: number, onDone: () => void) {
    this.duration = duration;
    this.running = true;
    this.startedAt = performance.now();
    this.onDone = onDone;
    if (duration <= 0) this.finish();
  },
  finish() {
    this.t = 1;
    if (this.running) {
      this.running = false;
      this.onDone?.();
    }
  },
  tick() {
    if (!this.running) return;
    this.t = Math.min(1, (performance.now() - this.startedAt) / 1000 / this.duration);
    if (this.t >= 1) this.finish();
  },
  onDone: undefined as undefined | (() => void),
};
