import * as THREE from 'three';
import { clamp, lerp } from '../../core/ticker';
import { stageFor } from '../../data/sections';
import { GLSL_INK, INK_BLEND, PALETTE, disposeScene, frameSubject, rng, type FrameState, type GLScene, type SceneContext } from '../types';

/** Administration → teachers → courses & batches → students. */
const LAYERS = [
  { nx: 2, nz: 2 },
  { nx: 5, nz: 3 },
  { nx: 8, nz: 5 },
  { nx: 14, nz: 9 },
];
const SP = 0.3;

const cellXZ = (l: number, i: number) => {
  const { nx, nz } = LAYERS[l];
  return [((i % nx) - (nx - 1) / 2) * SP, (Math.floor(i / nx) - (nz - 1) / 2) * SP];
};

/** Layered school structure; layers part, connect, and the student grid shows attendance. */
export class EliteScene implements GLScene {
  readonly id = 'elite' as const;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  private root = new THREE.Group();
  private layers: { group: THREE.Group; mat: THREE.ShaderMaterial; frame: THREE.LineBasicMaterial }[] = [];
  private links: THREE.ShaderMaterial;
  private layerY = [0, 0, 0, 0];

  constructor() {
    const box = new THREE.BoxGeometry(0.2, 0.05, 0.2);
    LAYERS.forEach(({ nx, nz }, l) => {
      const n = nx * nz;
      const cells = new Float32Array(n * 2);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 }, uLayer: { value: l }, uActive: { value: 0.4 },
          uColor: { value: PALETTE.steel }, uAccent: { value: PALETTE.accent }, uBg: { value: PALETTE.bg },
        },
        vertexShader: /* glsl */ `
          attribute vec2 aCell;
          uniform float uTime, uLayer;
          varying float vLit; varying float vTop;
          void main() {
            float day = floor(uTime * 0.7);
            float h = fract(sin(dot(aCell + day * vec2(3.1, 1.7), vec2(12.9898, 78.233))) * 43758.5453);
            vLit = uLayer > 2.5 ? step(0.28, h) : step(0.5, fract(sin(dot(aCell, vec2(4.1, 9.7)) + uLayer) * 9341.3));
            vTop = normal.y;
            gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor, uAccent, uBg; uniform float uActive;
          varying float vLit; varying float vTop;
          void main() {
            float top = step(0.5, vTop);
            // Inactive layers fade toward the page rather than to black.
            vec3 c = mix(uBg, uColor * mix(0.6, 1.0, top), mix(0.3, 1.0, uActive));
            c = mix(c, uAccent, vLit * top * uActive * 0.85);
            gl_FragColor = vec4(c, 1.0);
          }`,
      });
      for (let i = 0; i < n; i++) cells.set([i % nx, Math.floor(i / nx)], i * 2);
      const geo = box.clone();
      geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 2));
      const mesh = new THREE.InstancedMesh(geo, mat, n);
      const m = new THREE.Matrix4();
      for (let i = 0; i < n; i++) {
        const [x, z] = cellXZ(l, i);
        mesh.setMatrixAt(i, m.makeTranslation(x, 0, z));
      }

      const w = nx * SP + 0.12;
      const d = nz * SP + 0.12;
      const frameMat = new THREE.LineBasicMaterial({ color: PALETTE.steel, transparent: true, opacity: 0.3 });
      const frame = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-w / 2, 0, -d / 2), new THREE.Vector3(w / 2, 0, -d / 2),
          new THREE.Vector3(w / 2, 0, d / 2), new THREE.Vector3(-w / 2, 0, d / 2),
        ]),
        frameMat,
      );
      const group = new THREE.Group();
      group.add(mesh, frame);
      this.root.add(group);
      this.layers.push({ group, mat, frame: frameMat });
    });

    // Every node links to a parent in the layer above; pulses travel upward.
    const r = rng(5);
    const xz: number[] = [], lay: number[] = [], t: number[] = [], off: number[] = [];
    for (let l = 1; l < LAYERS.length; l++) {
      const n = LAYERS[l].nx * LAYERS[l].nz;
      const pn = LAYERS[l - 1].nx * LAYERS[l - 1].nz;
      for (let i = 0; i < n; i++) {
        const p = Math.floor((i / n) * pn);
        const o = r();
        xz.push(...cellXZ(l, i), ...cellXZ(l - 1, p));
        lay.push(l, l - 1);
        t.push(0, 1);
        off.push(o, o);
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(new Array(lay.length * 3).fill(0), 3));
    lg.setAttribute('aXZ', new THREE.Float32BufferAttribute(xz, 2));
    lg.setAttribute('aL', new THREE.Float32BufferAttribute(lay, 1));
    lg.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
    lg.setAttribute('aOff', new THREE.Float32BufferAttribute(off, 1));
    this.links = new THREE.ShaderMaterial({
      ...INK_BLEND,
      uniforms: { uLayerY: { value: this.layerY }, uTime: { value: 0 }, uConn: { value: 0 }, uColor: { value: PALETTE.steel } },
      vertexShader: /* glsl */ `
        attribute vec2 aXZ; attribute float aL; attribute float aT; attribute float aOff;
        uniform float uLayerY[4];
        varying float vT; varying float vOff;
        void main() {
          vT = aT; vOff = aOff;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(aXZ.x, uLayerY[int(aL)], aXZ.y, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uTime, uConn;
        ${GLSL_INK}
        varying float vT; varying float vOff;
        void main() {
          float head = fract(uTime * 0.35 + vOff);
          float band = 1.0 - smoothstep(0.0, 0.12, abs(head - vT));
          gl_FragColor = ink(uColor, (0.15 + band * 0.85) * uConn);
        }`,
    });
    const links = new THREE.LineSegments(lg, this.links);
    links.frustumCulled = false;
    this.root.add(links);

    this.scene.add(this.root);
    this.scene.background = PALETTE.bg.clone();
  }

  resize(ctx: SceneContext) {
    frameSubject(this.camera, ctx);
    this.camera.position.set(0, 0.2, ctx.mobile ? 9.5 : 7.4);
    this.camera.lookAt(0, 0, 0);
  }

  update(f: FrameState) {
    const p = f.sticky;
    const gap = lerp(0.12, 0.9, clamp(f.enter * 0.6 + p * 1.6 - 0.2));
    const stage = stageFor('elite', p);
    this.layers.forEach((L, i) => {
      this.layerY[i] = (1.5 - i) * gap;
      L.group.position.y = this.layerY[i];
      const target = i === stage ? 1 : i < stage ? 0.6 : 0.35;
      L.mat.uniforms.uActive.value = lerp(L.mat.uniforms.uActive.value, target, 0.08);
      L.mat.uniforms.uTime.value = f.time;
      L.frame.opacity = 0.15 + 0.5 * L.mat.uniforms.uActive.value;
    });
    this.links.uniforms.uTime.value = f.time;
    this.links.uniforms.uConn.value = clamp((gap - 0.3) / 0.5);

    this.root.rotation.x = 0.55 - f.pointer.y * 0.06;
    this.root.rotation.y = -0.6 + p * 0.9 + f.pointer.x * 0.15;
  }

  dispose() {
    disposeScene(this.scene);
  }
}
