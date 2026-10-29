import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Screen size in world units; the screen's centre is the origin of the device. */
export const SCREEN_W = 1;
export const SCREEN_H = 1.08;

const COLORS = {
  case: '#56644A',
  caseBack: '#3E4936',
  module: '#68765B',
  seam: '#141714',
  frame: '#161A14',
  base: '#232720',
  button: '#2C302A',
  accent: '#D4553A',
  accentDark: '#A3412C',
  window: '#E6E0D0',
};

const PAPER_LEN = 0.42;
const PAPER_H = 0.34;

/**
 * A chunky toy-like terminal, cel-shaded with ink outlines: cream case over a
 * dark seam, inset screen, coloured buttons, blue base with a card slot and
 * tray, and a side slot that prints a strip of chart paper.
 */
export class Terminal {
  group = new THREE.Group();
  private gradient: THREE.DataTexture;
  private outline: THREE.ShaderMaterial;
  private paper: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private flyer: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private ext = 0;
  private hold = 0;
  private flyT = -1;

  constructor(screen: THREE.Mesh, label: string) {
    this.gradient = new THREE.DataTexture(new Uint8Array([70, 150, 255]), 3, 1, THREE.RedFormat);
    this.gradient.minFilter = THREE.NearestFilter;
    this.gradient.magFilter = THREE.NearestFilter;
    this.gradient.needsUpdate = true;
    this.outline = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: { uT: { value: 0.016 } },
      vertexShader: 'uniform float uT; void main(){ vec3 p = position + normalize(normal) * uT; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'void main(){ gl_FragColor = vec4(0.02, 0.025, 0.02, 1.0); }',
    });

    const box = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 3, r);
    const add = (geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number, ink = true) => {
      const m = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color, gradientMap: this.gradient }));
      m.position.set(x, y, z);
      if (ink) m.add(new THREE.Mesh(geo, this.outline));
      this.group.add(m);
      return m;
    };

    // Case: front shell, dark seam, back shell.
    add(box(1.24, 1.5, 0.22, 0.07), COLORS.case, 0, -0.035, -0.11);
    add(box(1.21, 1.47, 0.05, 0.06), COLORS.seam, 0, -0.035, -0.245, false);
    add(box(1.2, 1.46, 0.18, 0.07), COLORS.caseBack, 0, -0.035, -0.36);

    // Screen sits in a dark frame proud of the front face.
    add(box(SCREEN_W + 0.05, SCREEN_H + 0.05, 0.03, 0.012), COLORS.frame, 0, 0, -0.005);
    screen.position.z = 0.0105;
    this.group.add(screen);

    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.075),
      new THREE.MeshBasicMaterial({ map: labelTexture(label), transparent: true }),
    );
    labelMesh.position.set(-0.25, 0.615, 0.002);
    this.group.add(labelMesh);

    // Controls under the screen.
    const pill = add(new THREE.CapsuleGeometry(0.035, 0.1, 4, 16), COLORS.accent, -0.39, -0.63, 0.005);
    pill.rotation.z = Math.PI / 2;
    const knob = (r: number) => new THREE.CylinderGeometry(r, r, 0.04, 28);
    for (const x of [-0.235, -0.12]) add(knob(0.045), COLORS.button, x, -0.63, 0.012).rotation.x = Math.PI / 2;
    add(knob(0.042), COLORS.accent, 0.43, -0.62, 0.012).rotation.x = Math.PI / 2;
    add(box(0.17, 0.018, 0.012, 0.004), COLORS.seam, 0.28, -0.7, 0.004, false);

    // Side slot the paper prints from.
    add(box(0.03, 0.5, 0.06, 0.012), COLORS.seam, -0.62, 0.1, -0.11, false);

    // Base with card module and tray.
    add(box(1.22, 0.52, 0.4, 0.06), COLORS.base, 0, -1.035, -0.23);
    add(box(0.26, 0.29, 0.06, 0.03), COLORS.module, -0.4, -1.03, -0.01);
    add(box(0.035, 0.17, 0.02, 0.01), COLORS.seam, -0.45, -1.03, 0.025, false);
    add(box(0.06, 0.2, 0.012, 0.006), COLORS.window, -0.355, -1.03, 0.024);
    add(box(0.42, 0.05, 0.14, 0.015), COLORS.accent, 0.3, -1.07, 0.07);
    for (const dx of [-0.185, 0.185]) add(box(0.05, 0.2, 0.14, 0.015), COLORS.accentDark, 0.3 + dx, -1.0, 0.07);

    // Paper strip anchored at the slot, growing to the left.
    const paperGeo = new THREE.PlaneGeometry(1, PAPER_H);
    paperGeo.translate(-0.5, 0, 0);
    this.paper = new THREE.Mesh(paperGeo, paperMaterial());
    this.paper.position.set(-0.64, 0.1, -0.11);
    this.flyer = new THREE.Mesh(paperGeo, paperMaterial());
    this.flyer.visible = false;
    this.group.add(this.paper, this.flyer);
  }

  update(dt: number, reduced: boolean) {
    if (reduced) {
      this.setPaper(this.paper, 0.3, 1);
      return;
    }
    if (this.ext < PAPER_LEN) {
      this.ext = Math.min(PAPER_LEN, this.ext + dt * 0.07);
    } else if ((this.hold += dt) > 0.8) {
      // Tear off: the printed strip flutters away and a new one starts.
      this.hold = 0;
      this.flyT = 0;
      this.flyer.visible = true;
      this.setPaper(this.flyer, this.ext, 1);
      this.ext = 0;
    }
    this.setPaper(this.paper, this.ext, 1);
    this.paper.rotation.y = Math.sin(this.ext * 9) * 0.06;

    if (this.flyT >= 0) {
      const t = (this.flyT += dt);
      this.flyer.position.set(-0.64 - t * 0.35, 0.1 - t * t * 0.9, -0.11 + t * 0.2);
      this.flyer.rotation.set(t * 0.6, t * 0.9, t * 1.3);
      this.flyer.material.uniforms.uAlpha.value = Math.max(0, 1 - t / 1.4);
      if (t > 1.4) {
        this.flyT = -1;
        this.flyer.visible = false;
      }
    }
  }

  private setPaper(mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>, ext: number, alpha: number) {
    mesh.scale.x = Math.max(0.001, ext);
    mesh.material.uniforms.uExt.value = ext;
    mesh.material.uniforms.uAlpha.value = alpha;
  }

  dispose() {
    this.gradient.dispose();
  }
}

/** Grid paper with a red trace, drawn procedurally so it never stretches. */
function paperMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    uniforms: { uExt: { value: 0 }, uAlpha: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform float uExt, uAlpha;
      varying vec2 vUv;
      void main() {
        float s = vUv.x * uExt;
        vec2 g = vec2(s, vUv.y * ${PAPER_H.toFixed(2)}) / 0.035;
        float grid = max(step(fract(g.x), 0.08), step(fract(g.y), 0.08));
        vec3 col = mix(vec3(0.96, 0.97, 0.93), vec3(0.62, 0.86, 0.6), grid * 0.8);
        float trace = 0.3 + 0.4 * clamp(s / 0.42, 0.0, 1.0) + 0.12 * sin(s * 31.0) * sin(s * 7.0);
        col = mix(col, vec3(0.88, 0.28, 0.37), 1.0 - smoothstep(0.012, 0.03, abs(vUv.y - trace)));
        float edge = step(vUv.y, 0.03) + step(0.97, vUv.y);
        col = mix(col, vec3(0.05), min(edge, 1.0));
        gl_FragColor = vec4(col, uAlpha);
      }`,
  });
}

function labelTexture(label: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 77;
  const g = c.getContext('2d')!;
  g.fillStyle = '#E2DCCB';
  g.textBaseline = 'middle';
  g.font = '600 46px Geist, sans-serif';
  const name = label.toUpperCase();
  g.fillText(name, 4, 40);
  const nameW = g.measureText(name).width;
  g.font = 'italic 300 44px Geist, sans-serif';
  g.fillText('2026', 18 + nameW, 40);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
