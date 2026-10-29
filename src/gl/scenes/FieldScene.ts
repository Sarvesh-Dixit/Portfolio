import * as THREE from 'three';
import type { SectionId } from '../../data/sections';
import { GLSL_INK, GLSL_POINTER, INK_BLEND, disposeScene, frameSubject, rng, type FrameState, type GLScene, type SceneContext } from '../types';

/**
 * drift    — loose ideas settle into a connected lattice (about, system map)
 * flow     — a stream of data sorts itself into five stages (process)
 * converge — everything collapses into one point (contact)
 */
export type FieldMode = 'drift' | 'flow' | 'converge';

export interface FieldOptions {
  mode: FieldMode;
  count: number;
  seed: number;
  colorA: THREE.Color;
  colorB: THREE.Color;
  lines?: boolean;
  alpha?: number;
  /** Morph amount 0→1 for this frame. */
  morph: (f: FrameState) => number;
  /** Number of stage columns (flow mode). */
  columns?: number;
  /** Process stage (flow mode). */
  stage?: (f: FrameState) => number;
  /** Shift the subject beside the text column. */
  frame?: boolean;
  size?: number;
  /** Negative values attract instead of repel. */
  pointerForce?: number;
  motion: (group: THREE.Group, f: FrameState) => void;
}

const MODES: Record<FieldMode, number> = { drift: 0, flow: 1, converge: 2 };

const vertex = (mode: number, points: boolean, columns = 5) => /* glsl */ `
#define MODE ${mode}
#define COLS ${columns.toFixed(1)}
attribute vec3 aRand;
attribute vec3 aGrid;
attribute float aSeed;
uniform float uTime, uMorph, uStage, uSize, uDpr;
varying float vHi;
varying float vA;
${GLSL_POINTER}
vec3 drift(vec3 p, float s) {
  return p + vec3(sin(uTime * 0.31 + s * 12.3), cos(uTime * 0.27 + s * 7.1), sin(uTime * 0.23 + s * 3.7)) * vec3(0.28, 0.22, 0.2);
}
vec3 fieldPos() {
#if MODE == 0
  float m = smoothstep(0.0, 1.0, clamp(uMorph * 1.5 - aSeed * 0.5, 0.0, 1.0));
  vHi = m;
  return mix(drift(aRand, aSeed), aGrid + vec3(0.0, sin(uTime * 0.8 + aGrid.x * 0.9) * 0.03, 0.0), m);
#elif MODE == 1
  float col = floor(aSeed * COLS);
  float x = mod(aRand.x + uTime * (0.35 + fract(aSeed * 7.13) * 0.5) + 6.0, 12.0) - 6.0;
  vec3 free = vec3(x, aRand.y, aRand.z);
  vec3 colp = vec3(-3.6 + col * 7.2 / (COLS - 1.0) + (fract(aSeed * 91.7) - 0.5) * 0.35, aRand.y * 1.15, aRand.z * 0.3);
  float m = smoothstep(0.0, 1.0, clamp(uMorph * 1.3 - fract(aSeed * 13.1) * 0.3, 0.0, 1.0));
  float current = step(abs(col - floor(uStage)), 0.5);
  vHi = m * max(current, step(col, uStage) * 0.4);
  return mix(free, colp, m);
#else
  float m = smoothstep(0.0, 1.0, clamp(uMorph * 1.25 - aSeed * 0.25, 0.0, 1.0));
  float a = aSeed * 6.2831 + uTime * (0.25 + aSeed * 0.35);
  vec3 orbit = vec3(cos(a), sin(a * 1.3) * 0.3, sin(a)) * (0.12 + aSeed * 0.6);
  vHi = m;
  return mix(drift(aRand, aSeed), orbit, m);
#endif
}
void main() {
  vec3 p = fieldPos();
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = repel(projectionMatrix * mv);
  ${points ? 'gl_PointSize = uSize * uDpr * (1.0 + vHi * 0.7) * (5.0 / -mv.z);' : ''}
  vA = smoothstep(18.0, 4.0, -mv.z);
}`;

const POINT_FRAG = /* glsl */ `
uniform vec3 uColA, uColB; uniform float uAlpha;
varying float vHi; varying float vA;
${GLSL_INK}
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d);
  vec3 c = mix(uColA, uColB, clamp(vHi, 0.0, 1.0));
  gl_FragColor = ink(c, a * vA * uAlpha * (0.45 + 0.9 * vHi));
}`;

const LINE_FRAG = /* glsl */ `
uniform vec3 uColB; uniform float uAlpha;
varying float vHi; varying float vA;
${GLSL_INK}
void main() { gl_FragColor = ink(uColB, vA * uAlpha * 0.3 * smoothstep(0.75, 1.0, vHi)); }`;

export class FieldScene implements GLScene {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
  private group = new THREE.Group();
  private uniforms: Record<string, THREE.IUniform>;
  private core?: THREE.Sprite;

  constructor(public id: SectionId, private o: FieldOptions, ctx: SceneContext) {
    this.camera.position.set(0, 0, 8);
    this.uniforms = {
      uTime: { value: 0 }, uMorph: { value: 0 }, uStage: { value: 0 },
      uSize: { value: o.size ?? 3.2 }, uDpr: { value: ctx.dpr }, uAlpha: { value: o.alpha ?? 1 },
      uColA: { value: o.colorA }, uColB: { value: o.colorB },
      uPointer: { value: new THREE.Vector2() }, uPointerForce: { value: o.pointerForce ?? 1 }, uAspect: { value: 1 },
    };
    const count = ctx.mobile ? Math.round(o.count * 0.55) : o.count;
    const { rand, grid, seed, nx, ny } = this.generate(count);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 3));
    geo.setAttribute('aGrid', new THREE.BufferAttribute(grid, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const blend = INK_BLEND;
    const points = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({ ...blend, uniforms: this.uniforms, vertexShader: vertex(MODES[o.mode], true, o.columns), fragmentShader: POINT_FRAG }),
    );
    points.frustumCulled = false;
    this.group.add(points);

    if (o.lines && o.mode === 'drift') {
      // Connect lattice neighbours on the front layer.
      const r: number[] = [], gr: number[] = [], sd: number[] = [];
      const push = (i: number) => {
        r.push(rand[i * 3], rand[i * 3 + 1], rand[i * 3 + 2]);
        gr.push(grid[i * 3], grid[i * 3 + 1], grid[i * 3 + 2]);
        sd.push(seed[i]);
      };
      for (let i = 0; i < Math.min(count, nx * ny); i++) {
        const ix = i % nx;
        const iy = Math.floor(i / nx);
        if (ix < nx - 1 && i + 1 < count) { push(i); push(i + 1); }
        if (iy < ny - 1 && i + nx < count) { push(i); push(i + nx); }
      }
      const lg = new THREE.BufferGeometry();
      lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(r.length), 3));
      lg.setAttribute('aRand', new THREE.Float32BufferAttribute(r, 3));
      lg.setAttribute('aGrid', new THREE.Float32BufferAttribute(gr, 3));
      lg.setAttribute('aSeed', new THREE.Float32BufferAttribute(sd, 1));
      const lines = new THREE.LineSegments(
        lg,
        new THREE.ShaderMaterial({ ...blend, uniforms: this.uniforms, vertexShader: vertex(0, false), fragmentShader: LINE_FRAG }),
      );
      lines.frustumCulled = false;
      this.group.add(lines);
    }

    if (o.mode === 'converge') {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d')!;
      const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(160,52,30,1)');
      grad.addColorStop(0.3, 'rgba(212,85,58,0.55)');
      grad.addColorStop(1, 'rgba(212,85,58,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      this.core = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, ...INK_BLEND }));
      this.group.add(this.core);
    }

    this.scene.add(this.group);
  }

  private generate(count: number) {
    const r = rng(this.o.seed);
    const rand = new Float32Array(count * 3);
    const grid = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const nx = 24;
    const ny = 13;
    const sp = 0.34;
    for (let i = 0; i < count; i++) {
      seed[i] = r();
      if (this.o.mode === 'converge') {
        const v = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize().multiplyScalar(3 + r() * 6);
        v.toArray(rand, i * 3);
      } else if (this.o.mode === 'flow') {
        rand.set([r() * 12 - 6, (r() * 2 - 1) * 1.6, (r() * 2 - 1) * 1.5], i * 3);
      } else {
        rand.set([r() * 12 - 6, r() * 7 - 3.5, r() * 7 - 5], i * 3);
      }
      const ix = i % nx;
      const iy = Math.floor(i / nx) % ny;
      const iz = Math.floor(i / (nx * ny));
      grid.set([(ix - (nx - 1) / 2) * sp, (iy - (ny - 1) / 2) * sp, -iz * sp * 1.4], i * 3);
    }
    return { rand, grid, seed, nx, ny };
  }

  resize(ctx: SceneContext) {
    if (this.o.frame) frameSubject(this.camera, ctx, 0.2);
    else {
      this.camera.aspect = ctx.width / ctx.height;
      this.camera.updateProjectionMatrix();
    }
    this.camera.position.z = this.camera.aspect < 1 ? 11 : 8;
    this.uniforms.uAspect.value = this.camera.aspect;
    this.uniforms.uDpr.value = ctx.dpr;
  }

  update(f: FrameState) {
    const u = this.uniforms;
    u.uTime.value = f.time;
    u.uMorph.value = this.o.morph(f);
    u.uStage.value = this.o.stage?.(f) ?? 0;
    (u.uPointer.value as THREE.Vector2).set(f.pointer.x, f.pointer.y);
    this.o.motion(this.group, f);
    if (this.core) {
      const m = u.uMorph.value as number;
      this.core.scale.setScalar(0.1 + m * m * 0.75 + Math.sin(f.time * 2) * 0.03 * m);
    }
  }

  dispose() {
    disposeScene(this.scene);
  }
}
