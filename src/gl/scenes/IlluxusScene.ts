import * as THREE from 'three';
import { projectById } from '../../data/projects';
import { clamp } from '../../core/ticker';
import { GLSL_INK, GLSL_POINTER, INK_BLEND, PALETTE, disposeScene, frameSubject, rng, type FrameState, type GLScene, type SceneContext } from '../types';

const GAP = 3.2;
const STAGES = projectById.illuxus.legend.items;
const TW = 1.6;
const TH = 0.9;

function ticketShape(w: number, h: number, r: number, notch: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, -notch);
  s.absarc(x + w, 0, notch, -Math.PI / 2, Math.PI / 2, true);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, notch);
  s.absarc(x, 0, notch, Math.PI / 2, -Math.PI / 2, true);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function ticketTexture(i: number) {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 360;
  const g = c.getContext('2d')!;
  const amber = '#E39A54';
  g.fillStyle = '#2A3026';
  g.fillRect(0, 0, 640, 360);
  g.strokeStyle = 'rgba(227,154,84,0.45)';
  g.lineWidth = 2;
  g.strokeRect(22, 22, 596, 316);

  g.setLineDash([6, 8]);
  g.beginPath();
  g.moveTo(468, 30);
  g.lineTo(468, 330);
  g.stroke();
  g.setLineDash([]);

  g.fillStyle = amber;
  g.font = '500 18px "Geist Mono", monospace';
  g.fillText('ILLUXUS · EVENT PASS', 48, 66);
  g.fillStyle = 'rgba(227,154,84,0.7)';
  g.fillText(`STAGE ${String(i + 1).padStart(2, '0')} / ${String(STAGES.length).padStart(2, '0')}`, 48, 96);

  g.fillStyle = '#EFEBDD';
  g.font = '86px "Instrument Serif", serif';
  g.fillText(STAGES[i], 44, 222);

  g.font = '14px "Geist Mono", monospace';
  g.fillStyle = 'rgba(239,235,221,0.5)';
  ['ORGANISER', 'ATTENDEE', 'SESSION'].forEach((t, k) => g.fillText(t, 48 + k * 136, 300));

  const r = rng(40 + i);
  g.fillStyle = 'rgba(239,235,221,0.8)';
  for (let x = 500; x < 590; ) {
    const w = 2 + Math.floor(r() * 5);
    g.fillRect(x, 70, w, 210);
    x += w + 2 + Math.floor(r() * 4);
  }
  g.save();
  g.translate(604, 330);
  g.rotate(-Math.PI / 2);
  g.fillStyle = amber;
  g.font = '14px "Geist Mono", monospace';
  g.fillText(`Nº ${String(i + 1).padStart(4, '0')}`, 0, 0);
  g.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Event lifecycle as a run of tickets; attendees gather as the camera passes. */
export class IlluxusScene implements GLScene {
  readonly id = 'illuxus' as const;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  private tickets: { group: THREE.Group; mat: THREE.MeshBasicMaterial; line: THREE.LineBasicMaterial; dot: THREE.MeshBasicMaterial }[] = [];
  private fill: THREE.Line;
  private crowd: THREE.ShaderMaterial;

  constructor(ctx: SceneContext) {
    const shape = ticketShape(TW, TH, 0.06, 0.09);
    const geo = new THREE.ShapeGeometry(shape, 12);
    // ShapeGeometry UVs are in shape units; remap to 0…1 for the texture.
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / TW + 0.5, pos.getY(i) / TH + 0.5);
    const outline = new THREE.BufferGeometry().setFromPoints(shape.getPoints(16));

    STAGES.forEach((_, i) => {
      const group = new THREE.Group();
      group.position.set(i * GAP, (i % 2 ? 0.12 : -0.06), 0);
      const mat = new THREE.MeshBasicMaterial({ map: ticketTexture(i), transparent: true });
      const line = new THREE.LineBasicMaterial({ color: PALETTE.ochre, transparent: true });
      group.add(new THREE.Mesh(geo, mat), new THREE.LineLoop(outline, line));
      const dot = new THREE.MeshBasicMaterial({ color: PALETTE.ochre });
      const marker = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.08, 24), dot);
      marker.position.set(i * GAP, -1.05, 0);
      this.scene.add(group, marker);
      this.tickets.push({ group, mat, line, dot });
    });

    const span = GAP * (STAGES.length - 1) + 6;
    const base = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(span, 0, 0)]);
    const track = new THREE.Line(base, new THREE.LineBasicMaterial({ color: PALETTE.ochre, transparent: true, opacity: 0.35 }));
    this.fill = new THREE.Line(base, new THREE.LineBasicMaterial({ color: PALETTE.ochre }));
    track.position.set(-3, -1.05, 0);
    this.fill.position.copy(track.position);
    this.scene.add(track, this.fill);

    const count = ctx.mobile ? 600 : 1400;
    const r = rng(11);
    const start = new Float32Array(count * 3);
    const rnd = new Float32Array(count * 3);
    const ticket = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const k = Math.floor(r() * STAGES.length);
      ticket[i] = k;
      start.set([k * GAP - 6 - r() * 4, -2.6 - r() * 2, -r() * 3], i * 3);
      rnd.set([r(), r(), r()], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(start, 3));
    g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 3));
    g.setAttribute('aTicket', new THREE.BufferAttribute(ticket, 1));
    this.crowd = new THREE.ShaderMaterial({
      ...INK_BLEND,
      uniforms: {
        uTime: { value: 0 }, uCamX: { value: 0 }, uGap: { value: GAP }, uDpr: { value: ctx.dpr },
        uColor: { value: PALETTE.ochre }, uPointer: { value: new THREE.Vector2() }, uPointerForce: { value: 1 }, uAspect: { value: 1 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aRnd; attribute float aTicket;
        uniform float uTime, uCamX, uGap, uDpr;
        varying float vA;
        ${GLSL_POINTER}
        void main() {
          float tx = aTicket * uGap;
          float reveal = smoothstep(tx - uGap * 0.9, tx - uGap * 0.1, uCamX);
          float e = reveal * reveal * (3.0 - 2.0 * reveal);
          float ang = aRnd.x * 6.2831 + uTime * (0.1 + aRnd.y * 0.15);
          float rad = 1.05 + aRnd.y * 0.55;
          vec3 ring = vec3(tx + cos(ang) * rad * 1.15, sin(ang) * rad * 0.62 - 0.05, -0.25 - aRnd.z * 0.8);
          vec3 p = mix(position, ring, e);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = repel(projectionMatrix * mv);
          gl_PointSize = 4.2 * uDpr * (0.6 + aRnd.z) * (4.0 / -mv.z);
          vA = mix(0.12, 1.0, e) * smoothstep(14.0, 2.0, -mv.z);
        }`,
      fragmentShader: `uniform vec3 uColor; varying float vA; ${GLSL_INK} void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = ink(uColor, smoothstep(0.5, 0.1, d) * vA); }`,
    });
    const crowd = new THREE.Points(g, this.crowd);
    crowd.frustumCulled = false;
    this.scene.add(crowd);
    this.scene.background = PALETTE.bg.clone();
  }

  resize(ctx: SceneContext) {
    frameSubject(this.camera, ctx);
    this.crowd.uniforms.uAspect.value = ctx.width / ctx.height;
    this.crowd.uniforms.uDpr.value = ctx.dpr;
  }

  update(f: FrameState) {
    const last = GAP * (STAGES.length - 1);
    const camX = clamp(f.sticky) * last;
    this.camera.position.set(camX - 0.9 + f.pointer.x * 0.3, 0.35 + f.pointer.y * 0.18, 4.6);
    this.camera.lookAt(camX + 0.15, -0.15, 0);

    this.tickets.forEach((t, i) => {
      const dx = i * GAP - camX;
      const active = 1 - clamp(Math.abs(dx) / GAP);
      t.group.rotation.y = -0.45 * Math.sign(dx) * (1 - active);
      t.group.position.z = active * 0.35;
      t.group.position.y = (i % 2 ? 0.12 : -0.06) + Math.sin(f.time * 0.8 + i) * 0.03;
      t.mat.opacity = 0.35 + 0.65 * active;
      t.line.opacity = 0.25 + 0.75 * active;
      t.dot.color.copy(PALETTE.bg).lerp(PALETTE.ochre, 0.3 + 0.7 * active);
    });
    this.fill.scale.x = Math.max(0.001, (camX + 3) / (last + 6));

    const u = this.crowd.uniforms;
    u.uTime.value = f.time;
    u.uCamX.value = camX;
    (u.uPointer.value as THREE.Vector2).set(f.pointer.x, f.pointer.y);
  }

  dispose() {
    this.tickets.forEach((t) => t.mat.map?.dispose());
    disposeScene(this.scene);
  }
}
