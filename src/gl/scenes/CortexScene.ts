import * as THREE from 'three';
import { cortexStage } from '../../data/sections';
import { GLSL_INK, GLSL_POINTER, INK_BLEND, PALETTE, disposeScene, frameSubject, rng, type FrameState, type GLScene, type SceneContext } from '../types';

/**
 * Raw cloud → lines of text (extraction) → clusters (analysis) → dense cube
 * (compression) → compact rows (structured output). Each point carries all
 * five targets; the vertex shader blends them by the scroll-driven stage.
 */
export class CortexScene implements GLScene {
  readonly id = 'cortex' as const;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
  private group = new THREE.Group();
  private mat: THREE.ShaderMaterial;

  constructor(ctx: SceneContext) {
    const N = ctx.mobile ? 3500 : 9000;
    const r = rng(23);
    const g = () => (r() + r() + r() - 1.5) * 1.15;
    const raw = new Float32Array(N * 3);
    const rows = new Float32Array(N * 3);
    const clus = new Float32Array(N * 3);
    const cube = new Float32Array(N * 3);
    const out = new Float32Array(N * 3);
    const seed = new Float32Array(N * 2);

    const R = 16;
    const perRow = Math.ceil(N / R);
    const rowLen = Array.from({ length: R }, () => 0.55 + r() * 0.45);
    const K = 7;
    const n = Math.ceil(Math.cbrt(N));
    const cs = 1.15 / n;
    const OR = 9;
    const perOut = Math.ceil(N / OR);
    const outLen = Array.from({ length: OR }, () => 0.45 + r() * 0.55);

    for (let i = 0; i < N; i++) {
      raw.set([g() * 2.2, g() * 1.3, g() * 1.4], i * 3);

      const row = i % R;
      const t = Math.floor(i / R) / perRow;
      const word = Math.floor(t * 12);
      rows.set([-2.6 + (t * 5.2 + word * 0.12) * rowLen[row], 1.5 - row * 0.2 + (r() - 0.5) * 0.02, (r() - 0.5) * 0.04], i * 3);

      const k = Math.floor(r() * K);
      const a = (k / K) * Math.PI * 2;
      clus.set([Math.cos(a) * 2.1 + g() * 0.3, Math.sin(a) * 1.2 + g() * 0.3, Math.sin(a * 2) * 0.6 + g() * 0.3], i * 3);

      const ix = i % n;
      const iy = Math.floor(i / n) % n;
      const iz = Math.floor(i / (n * n));
      cube.set([(ix - (n - 1) / 2) * cs, (iy - (n - 1) / 2) * cs, (iz - (n - 1) / 2) * cs], i * 3);

      const orow = i % OR;
      const ot = Math.floor(i / OR) / perOut;
      const indent = (orow % 3) * 0.18 * (orow > 0 && orow < OR - 1 ? 1 : 0);
      out.set([-1.1 + indent + ot * 2.2 * outLen[orow], 0.6 - orow * 0.15, (r() - 0.5) * 0.02], i * 3);

      seed.set([r(), k / K], i * 2);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(raw, 3));
    geo.setAttribute('aP1', new THREE.BufferAttribute(rows, 3));
    geo.setAttribute('aP2', new THREE.BufferAttribute(clus, 3));
    geo.setAttribute('aP3', new THREE.BufferAttribute(cube, 3));
    geo.setAttribute('aP4', new THREE.BufferAttribute(out, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 2));

    this.mat = new THREE.ShaderMaterial({
      ...INK_BLEND,
      uniforms: {
        uStage: { value: 0 }, uTime: { value: 0 }, uDpr: { value: ctx.dpr },
        uRaw: { value: PALETTE.ink.clone().lerp(PALETTE.grey, 0.4) },
        uRow: { value: PALETTE.ink },
        uClu: { value: PALETTE.accent },
        uClu2: { value: PALETTE.ink },
        uCube: { value: PALETTE.accent },
        uOut: { value: PALETTE.accent.clone().lerp(PALETTE.ink, 0.45) },
        uPointer: { value: new THREE.Vector2() }, uPointerForce: { value: 1 }, uAspect: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aP1, aP2, aP3, aP4;
        attribute vec2 aSeed;
        uniform float uStage, uTime, uDpr;
        uniform vec3 uRaw, uRow, uClu, uClu2, uCube, uOut;
        varying vec3 vCol; varying float vA;
        ${GLSL_POINTER}
        void main() {
          float sp = clamp(uStage + (aSeed.x - 0.5) * 0.4, 0.0, 4.0);
          float f = fract(sp);
          f = f * f * (3.0 - 2.0 * f);
          vec3 raw = position + vec3(sin(uTime * 0.5 + aSeed.x * 30.0), cos(uTime * 0.4 + aSeed.x * 17.0), sin(uTime * 0.35 + aSeed.x * 9.0)) * 0.18;
          vec3 clu = mix(uClu, uClu2, step(0.5, fract(aSeed.y * 3.5)));
          vec3 p; vec3 c;
          if (sp < 1.0)      { p = mix(raw, aP1, f); c = mix(uRaw, uRow, f); }
          else if (sp < 2.0) { p = mix(aP1, aP2, f); c = mix(uRow, clu, f); }
          else if (sp < 3.0) { p = mix(aP2, aP3, f); c = mix(clu, uCube, f); }
          else if (sp < 4.0) { p = mix(aP3, aP4, f); c = mix(uCube, uOut, f); }
          else               { p = aP4; c = uOut; }
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = repel(projectionMatrix * mv);
          gl_PointSize = 3.6 * uDpr * mix(1.0, 0.8, smoothstep(2.0, 3.0, sp)) * (5.0 / -mv.z);
          vCol = c;
          vA = smoothstep(16.0, 3.0, -mv.z) * mix(0.8, 1.0, smoothstep(0.5, 3.0, sp));
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vCol; varying float vA;
        ${GLSL_INK}
        void main() {
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = ink(vCol, smoothstep(0.5, 0.15, d) * vA * 0.85);
        }`,
    });
    const pts = new THREE.Points(geo, this.mat);
    pts.frustumCulled = false;
    this.group.add(pts);
    this.scene.add(this.group);
    this.scene.background = PALETTE.bg.clone();
  }

  resize(ctx: SceneContext) {
    frameSubject(this.camera, ctx);
    this.camera.position.set(0, 0, ctx.mobile ? 9 : 6.6);
    this.mat.uniforms.uAspect.value = ctx.width / ctx.height;
    this.mat.uniforms.uDpr.value = ctx.dpr;
  }

  update(f: FrameState) {
    const stage = cortexStage(f.sticky);
    const u = this.mat.uniforms;
    u.uStage.value = stage;
    u.uTime.value = f.time;
    // Tokens scatter from the cursor while raw; structure resists it.
    u.uPointerForce.value = 1.4 * (1 - Math.min(1, stage / 3));
    (u.uPointer.value as THREE.Vector2).set(f.pointer.x, f.pointer.y);
    // A half turn while compressed, so the cube reads as a volume.
    const turn = Math.sin(Math.min(1, Math.max(0, (stage - 2) / 2)) * Math.PI) * 0.6;
    this.group.rotation.y = f.pointer.x * 0.18 + Math.sin(f.time * 0.15) * 0.08 + turn;
    this.group.rotation.x = -f.pointer.y * 0.1;
  }

  dispose() {
    disposeScene(this.scene);
  }
}
