import * as THREE from 'three';
import { rng } from './types';

const BG = '#222A1E';
const LIME = '#D9E39C';
const YELLOW = '#F0CF55';
const DIM = '#6E7A55';

/**
 * The terminal's own pixel UI: a header and a scrolling tick chart, drawn
 * on a small canvas and sampled with nearest filtering.
 */
export class ScreenChrome {
  texture: THREE.CanvasTexture;
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private series: number[] = [];
  private rand = rng(99);
  private lastStep = -1;
  private w: number;
  private h = 240;

  constructor(aspect: number) {
    this.w = Math.round(this.h * aspect);
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    const n = Math.floor((this.w - 20) / 4);
    let v = 0.5;
    for (let i = 0; i < n; i++) this.series.push((v = this.next(v)));
  }

  private next(v: number) {
    return Math.min(0.92, Math.max(0.08, v + (this.rand() - 0.5) * 0.12 + (0.5 - v) * 0.03));
  }

  draw(time: number, reduced: boolean) {
    const step = Math.floor(time * (reduced ? 0.5 : 9));
    if (step === this.lastStep) return;
    const advance = this.lastStep < 0 ? 0 : Math.min(step - this.lastStep, 20);
    this.lastStep = step;
    for (let i = 0; i < advance; i++) {
      this.series.shift();
      this.series.push(this.next(this.series[this.series.length - 1]));
    }

    const { ctx, w, h } = this;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    ctx.textBaseline = 'top';
    ctx.font = '28px VT323, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = LIME;
    ctx.fillText('Systems', 14, 16);
    ctx.fillText('Overview', 14, 42);
    ctx.textAlign = 'right';
    ctx.fillStyle = YELLOW;
    ctx.fillText(Math.floor(time * 2) % 2 ? 'ONLINE' : 'ONLINE_', w - 12, 16);

    // Tick chart: short vertical marks following the series, like a ticker tape.
    const top = h * 0.42;
    const span = h * 0.42;
    ctx.fillStyle = LIME;
    this.series.forEach((v, i) => {
      const prev = this.series[i - 1] ?? v;
      const size = 4 + Math.min(10, Math.abs(v - prev) * 90);
      ctx.fillRect(10 + i * 4, Math.round(top + (1 - v) * span - size / 2), 2, Math.round(size));
    });

    ctx.font = '16px VT323, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = DIM;
    ctx.fillText('> work/ 04 projects', 14, h - 22);
    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
  }
}
