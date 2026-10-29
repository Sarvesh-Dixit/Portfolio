import * as THREE from 'three';
import { automationStore } from '../../core/state';
import { PLATFORMS, SIM_TIMELINE, type Platform } from '../../data/automation';
import { clamp, lerp } from '../../core/ticker';
import { GLSL_INK, INK_BLEND, PALETTE, disposeScene, frameSubject, type FrameState, type GLScene, type SceneContext } from '../types';

const PACKETS = 14;

interface Channel {
  id: Platform;
  curve: THREE.QuadraticBezierCurve3;
  lineMat: THREE.ShaderMaterial;
  ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  core: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  color: THREE.Color;
  active: number;
}

/** A hub with three messaging endpoints; packets flow along the links. */
export class AutomationScene implements GLScene {
  readonly id = 'automation' as const;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  private root = new THREE.Group();
  private hub = new THREE.Group();
  private hubCore: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private channels: Channel[] = [];
  private packets: THREE.Points;
  private simPacket: THREE.Mesh;
  private tmp = new THREE.Vector3();
  private tmpCol = new THREE.Color();

  constructor(ctx: SceneContext) {
    const shell = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.62, 1)),
      new THREE.LineBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.7 }),
    );
    this.hubCore = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), new THREE.MeshBasicMaterial({ color: PALETTE.accent }));
    const orbit = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, 1.05, 1.05).getPoints(128).map((p) => new THREE.Vector3(p.x, p.y, 0))),
      new THREE.LineDashedMaterial({ color: PALETTE.accent, dashSize: 0.05, gapSize: 0.07, transparent: true, opacity: 0.35 }),
    );
    orbit.computeLineDistances();
    orbit.rotation.x = Math.PI / 2.4;
    this.hub.add(shell, this.hubCore, orbit);
    this.root.add(this.hub);

    // Supporting services behind the hub.
    const svcMat = new THREE.MeshBasicMaterial({ color: PALETTE.grey });
    const svcLine = new THREE.LineBasicMaterial({ color: PALETTE.grey, transparent: true, opacity: 0.25 });
    [[-1.3, 0.95], [1.3, 0.95], [-1.3, -0.95], [1.3, -0.95]].forEach(([x, y]) => {
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), svcMat);
      node.position.set(x, y, -1.3);
      this.root.add(node, new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), node.position]), svcLine));
    });

    PLATFORMS.forEach((p, i) => {
      const a = THREE.MathUtils.degToRad(p.angle);
      const end = new THREE.Vector3(Math.cos(a) * 2.5, Math.sin(a) * 1.75, (i - 1) * 0.4);
      const perp = new THREE.Vector3(-end.y, end.x, 0).normalize().multiplyScalar(0.55);
      const curve = new THREE.QuadraticBezierCurve3(end, end.clone().multiplyScalar(0.5).add(perp), new THREE.Vector3());
      const pts = curve.getPoints(80);
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      g.setAttribute('aT', new THREE.Float32BufferAttribute(pts.map((_, k) => k / 80), 1));
      const color = new THREE.Color(p.color);
      const lineMat = new THREE.ShaderMaterial({
        ...INK_BLEND,
        uniforms: { uColor: { value: color }, uTime: { value: 0 }, uActive: { value: 0.5 } },
        vertexShader: 'attribute float aT; varying float vT; void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uTime, uActive; varying float vT;
          ${GLSL_INK}
          void main() {
            float dash = smoothstep(0.6, 1.0, fract(vT * 7.0 - uTime * (0.4 + uActive)));
            float a = mix(0.12, 0.5, uActive) + dash * mix(0.15, 0.9, uActive);
            gl_FragColor = ink(mix(vec3(0.45), uColor, uActive), a);
          }`,
      });
      this.root.add(new THREE.Line(g, lineMat));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.012, 8, 64), new THREE.MeshBasicMaterial({ color: color.clone() }));
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: color.clone() }));
      ring.position.copy(end);
      core.position.copy(end);
      this.root.add(ring, core);
      this.channels.push({ id: p.id, curve, lineMat, ring, core, color, active: 0.5 });
    });

    const total = PACKETS * PLATFORMS.length;
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
    pg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(total * 3), 3));
    this.packets = new THREE.Points(
      pg,
      new THREE.PointsMaterial({ size: ctx.mobile ? 0.07 : 0.06, vertexColors: true, transparent: true, depthWrite: false }),
    );
    this.packets.frustumCulled = false;
    this.root.add(this.packets);

    this.simPacket = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshBasicMaterial({ color: PALETTE.ink }));
    this.simPacket.visible = false;
    this.root.add(this.simPacket);

    this.scene.add(this.root);
    this.scene.background = PALETTE.bg.clone();
  }

  resize(ctx: SceneContext) {
    frameSubject(this.camera, ctx);
    this.camera.position.set(0, 0, ctx.mobile ? 9.5 : 7.2);
    this.camera.lookAt(0, 0, 0);
  }

  update(f: FrameState) {
    const { selected, simStart } = automationStore.get();
    const sim = simStart === null ? -1 : (performance.now() - simStart) / 1000;
    const simChannel = selected ?? 'whatsapp';
    const pos = this.packets.geometry.attributes.position as THREE.BufferAttribute;
    const col = this.packets.geometry.attributes.color as THREE.BufferAttribute;

    this.channels.forEach((c, ci) => {
      const target = selected ? (c.id === selected ? 1 : 0.15) : 0.5;
      c.active = lerp(c.active, target, 0.08);
      c.lineMat.uniforms.uActive.value = c.active;
      c.lineMat.uniforms.uTime.value = f.time;
      const s = 0.8 + c.active * 0.6 + Math.sin(f.time * 2 + ci) * 0.04;
      c.ring.scale.setScalar(s);
      c.ring.lookAt(this.camera.position);
      c.ring.material.color.copy(PALETTE.bg).lerp(c.color, 0.35 + 0.65 * c.active);
      c.core.material.color.copy(PALETTE.bg).lerp(c.color, 0.35 + 0.65 * c.active);
      for (let k = 0; k < PACKETS; k++) {
        const inbound = k % 2 === 0;
        const t = (k / PACKETS + f.time * (0.08 + c.active * 0.12) * (inbound ? 1 : -1) + 10) % 1;
        c.curve.getPoint(t, this.tmp);
        pos.setXYZ(ci * PACKETS + k, this.tmp.x, this.tmp.y, this.tmp.z);
        this.tmpCol.copy(PALETTE.bg).lerp(c.color, 0.35 + 0.65 * c.active);
        col.setXYZ(ci * PACKETS + k, this.tmpCol.r, this.tmpCol.g, this.tmpCol.b);
      }
    });
    pos.needsUpdate = true;
    col.needsUpdate = true;

    // Illustrative workflow run: in along the link, process, reply out.
    const T = SIM_TIMELINE;
    const ch = this.channels.find((c) => c.id === simChannel)!;
    let pulse = 0;
    if (sim >= 0 && sim < T.total) {
      if (sim < T.inbound) {
        this.simPacket.visible = true;
        ch.curve.getPoint(sim / T.inbound, this.simPacket.position);
      } else if (sim < T.inbound + T.process) {
        this.simPacket.visible = false;
        pulse = Math.sin(((sim - T.inbound) / T.process) * Math.PI);
      } else {
        this.simPacket.visible = true;
        ch.curve.getPoint(1 - clamp((sim - T.inbound - T.process) / T.outbound), this.simPacket.position);
      }
    } else {
      this.simPacket.visible = false;
    }

    this.hubCore.scale.setScalar(1 + pulse * 0.9 + Math.sin(f.time * 3) * 0.05);
    this.hub.rotation.y = f.time * 0.25 + pulse;
    this.hub.rotation.x = f.time * 0.1;
    this.hub.position.set(f.pointer.x * 0.15, f.pointer.y * 0.1, 0);
    this.root.rotation.y = f.pointer.x * 0.25 + Math.sin(f.time * 0.12) * 0.1;
    this.root.rotation.x = -f.pointer.y * 0.15;
  }

  dispose() {
    disposeScene(this.scene);
  }
}
