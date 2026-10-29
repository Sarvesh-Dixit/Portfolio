import * as THREE from 'three';
import { profile } from '../data/profile';

const BG = '#1C2219';
const LIME = '#D9E39C';
const DIM = '#6E7A55';
const WHITE = '#EFEBDD';

const LOG = [
  ['BOOT', 'portfolio.os'],
  ['MOUNT', '/work/illuxus'],
  ['MOUNT', '/work/elite-class'],
  ['LOAD', 'cortex.context'],
  ['LINK', 'whatsapp telegram discord'],
  ['COMPILE', 'scene shaders'],
];

/**
 * Low-resolution canvas drawn like a boot console: log lines, name, and a
 * 21-segment pixel progress bar. Sampled with nearest filtering by the
 * monitor's screen shader, which adds the CRT curvature, split and mask.
 */
export class BootScreen {
  texture!: THREE.CanvasTexture;
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;
  private key = '';
  private w = 0;
  private h = 0;
  private compact = false;

  constructor() {
    this.resize(16 / 9, false);
  }

  resize(aspect: number, mobile: boolean) {
    this.compact = mobile && aspect < 1;
    this.h = this.compact ? Math.round(360 / aspect) : 400;
    this.w = this.compact ? 360 : Math.round(400 * aspect);
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    // Textures are immutable once uploaded; a new size needs a new texture.
    this.texture?.dispose();
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.key = '';
  }

  draw(progress: number, time: number, ready: boolean) {
    const blink = Math.floor(time * 2.2) % 2 === 0;
    const key = `${Math.floor(progress)}|${blink}|${ready}`;
    if (key === this.key) return;
    this.key = key;

    const { ctx, w, h } = this;
    const pad = this.compact ? 14 : 18;
    const small = this.compact ? 14 : 16;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    ctx.textBaseline = 'top';

    ctx.font = `${small}px VT323, monospace`;
    ctx.fillStyle = DIM;
    ctx.textAlign = 'left';
    ctx.fillText(`${profile.name.toUpperCase()} // SYSTEMS`, pad, pad);
    ctx.textAlign = 'right';
    ctx.fillText('REV 26.10', w - pad, pad);

    // Boot log: one line per completed slice of progress.
    ctx.textAlign = 'left';
    const shown = Math.min(LOG.length, Math.floor((progress / 100) * (LOG.length + 0.6)));
    const lineH = small + 2;
    const maxW = w - pad * 2 - ctx.measureText(' OK').width;
    const dotW = ctx.measureText('.').width;
    for (let i = 0; i < shown; i++) {
      const [verb, obj] = LOG[i];
      const left = `${verb.padEnd(8)}${obj} `;
      const dots = '.'.repeat(Math.max(2, Math.floor((maxW - ctx.measureText(left).width) / dotW)));
      ctx.fillStyle = WHITE;
      ctx.fillText(`${left}${dots}`, pad, pad + lineH * (i + 2));
      ctx.fillStyle = LIME;
      ctx.textAlign = 'right';
      ctx.fillText('OK', w - pad, pad + lineH * (i + 2));
      ctx.textAlign = 'left';
    }
    if (blink && !ready) {
      ctx.fillStyle = LIME;
      ctx.fillRect(pad, pad + lineH * (shown + 2) + 2, small * 0.5, small - 4);
    }

    // Name, centred in the upper-middle.
    const titleY = Math.round(h * (this.compact ? 0.44 : 0.46));
    ctx.textAlign = 'center';
    ctx.fillStyle = WHITE;
    ctx.font = `${Math.round(Math.min(w * 0.11, h * 0.13))}px VT323, monospace`;
    ctx.fillText(profile.name.toUpperCase(), w / 2, titleY - h * 0.07);
    ctx.font = `${small}px VT323, monospace`;
    ctx.fillStyle = DIM;
    ctx.fillText('PRODUCTS  ·  AI SYSTEMS  ·  AUTOMATION', w / 2, titleY + h * 0.04);

    // 298×30 bar, 2px border, 21 segments of 10px with 4px gaps.
    const bw = 298;
    const bh = 30;
    const bx = Math.round(w / 2 - bw / 2);
    const by = Math.round(h * 0.68 - bh / 2);
    ctx.fillStyle = WHITE;
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = BG;
    ctx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);
    const filled = Math.floor(((progress + 0.1) / 100) * 21);
    ctx.fillStyle = LIME;
    for (let i = 0; i < filled; i++) ctx.fillRect(bx + 4 + i * 14, by + 4, 10, bh - 8);

    ctx.fillStyle = ready ? LIME : WHITE;
    ctx.fillText(ready ? (blink ? 'READY_' : 'READY ') : `${String(Math.floor(progress)).padStart(3, '0')}%`, w / 2, by + bh + 10);

    this.texture.needsUpdate = true;
  }

  dispose() {
    this.texture.dispose();
  }
}
