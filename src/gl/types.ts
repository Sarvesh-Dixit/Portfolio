import * as THREE from 'three';
import type { SectionId } from '../data/sections';

export interface FrameState {
  time: number;
  dt: number;
  /** 0→1 across the section's whole GL range. */
  progress: number;
  /** 0→1 while the section's DOM stage is pinned (matches CSS `--p`). */
  sticky: number;
  /** 0→1 as the section scrolls in from below (one viewport before it pins). */
  enter: number;
  /** Smoothed pointer, NDC. Zero on touch devices. */
  pointer: { x: number; y: number };
  velocity: number;
}

export interface SceneContext {
  width: number;
  height: number;
  dpr: number;
  mobile: boolean;
  reduced: boolean;
}

export interface GLScene {
  id: SectionId;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update(f: FrameState): void;
  resize(ctx: SceneContext): void;
  dispose(): void;
}

/** Earthy industrial: cream paper, ink, terracotta accent, muted project tints. */
export const PALETTE = {
  bg: new THREE.Color('#ECE6D8'),
  ink: new THREE.Color('#1E2420'),
  accent: new THREE.Color('#D4553A'),
  ochre: new THREE.Color('#C77A2E'),
  steel: new THREE.Color('#4F6D7A'),
  moss: new THREE.Color('#5E7D4E'),
  grey: new THREE.Color('#8A8778'),
};

/**
 * Ink-on-paper blending for a light page: each fragment multiplies what is
 * already there by its colour, so marks darken the cream and overlaps deepen.
 * Pair with GLSL_INK and output `ink(colour, strength)`.
 */
export const INK_BLEND = {
  transparent: true,
  depthWrite: false,
  blending: THREE.MultiplyBlending,
  premultipliedAlpha: true,
} as const;

export const GLSL_INK = /* glsl */ `
vec4 ink(vec3 c, float k) { return vec4(mix(vec3(1.0), c, clamp(k, 0.0, 1.0)), 1.0); }
`;

/**
 * Shift the projection so the subject sits beside the text column
 * (right on desktop, upper half on mobile), without moving the camera.
 */
export function frameSubject(camera: THREE.PerspectiveCamera, ctx: SceneContext, amount = 0.17) {
  const { width: w, height: h } = ctx;
  camera.aspect = w / h;
  if (ctx.mobile) camera.setViewOffset(w, h, 0, h * amount * 1.2, w, h);
  else camera.setViewOffset(w, h, -w * amount, 0, w, h);
  camera.updateProjectionMatrix();
}

export function disposeScene(scene: THREE.Object3D) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else mat?.dispose();
  });
}

/** Deterministic PRNG so scenes look identical on every visit. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shared GLSL: screen-space pointer repulsion applied after projection. */
export const GLSL_POINTER = /* glsl */ `
uniform vec2 uPointer;
uniform float uPointerForce;
uniform float uAspect;
vec4 repel(vec4 clip) {
  vec2 ndc = clip.xy / clip.w;
  vec2 d = (ndc - uPointer) * vec2(uAspect, 1.0);
  float f = exp(-dot(d, d) * 9.0) * uPointerForce;
  clip.xy += normalize(d + 1e-5) * f * 0.12 * clip.w;
  return clip;
}
`;
