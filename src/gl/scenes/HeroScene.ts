import * as THREE from 'three';
import { BootScreen } from '../BootScreen';
import { ScreenChrome } from '../ScreenChrome';
import { SCREEN_H, SCREEN_W, Terminal } from '../Terminal';
import { GLSL_INK, GLSL_POINTER, INK_BLEND, PALETTE, disposeScene, rng, type FrameState, type GLScene, type SceneContext } from '../types';
import { profile } from '../../data/profile';
import { clamp, easeInOutCubic } from '../../core/ticker';

const FOV = 35;
/** Scroll position (viewports) where the camera has fully entered the screen. */
const DIVE_END = 1.42;

/**
 * The screen is nearly square but the viewport isn't, so the boot console and
 * the next section's live feed live in a viewport-shaped band in its middle.
 * The terminal's own pixel UI fills the whole screen when seen from outside.
 */
const SCREEN_FRAG = /* glsl */ `
uniform sampler2D tBoot; uniform sampler2D tLive; uniform sampler2D tChrome;
uniform float uMode, uDive, uTime, uBandAspect, uRows, uScan, uFrame;
uniform vec4 uBand;
varying vec2 vUv;
float sdRound(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float hash(float n) { return fract(sin(n) * 43758.5453); }
vec2 curve(vec2 uv, float k) { vec2 c = uv - 0.5; return c * (1.0 + dot(c, c) * k) + 0.5; }
vec3 split(vec2 uv) {
  vec2 r = abs(uv - 0.5);
  float o = r.y * r.y * r.y * 0.01 + 0.001;
  return vec3(texture2D(tBoot, uv + vec2(0.0, o)).r, texture2D(tBoot, uv).g, texture2D(tBoot, uv - vec2(0.0, o)).b);
}
void main() {
  vec2 uv = vUv;
  float tear = sin(clamp(uMode, 0.0, 1.0) * 3.14159);
  uv.x += (hash(floor(uv.y * 48.0) + floor(uTime * 24.0)) - 0.5) * 0.05 * tear;

  vec2 buv = (uv - uBand.xy) / uBand.zw;
  float inBand = step(0.0, buv.x) * step(buv.x, 1.0) * step(0.0, buv.y) * step(buv.y, 1.0);

  vec2 b = curve(buv, 0.2);
  float d = sdRound((b - 0.5) * vec2(uBandAspect, 1.0), vec2(uBandAspect * 0.5, 0.5), 0.06);
  vec3 boot = split(b) * (1.0 - smoothstep(-0.002, 0.002, d)) * inBand;
  boot *= mix(1.0, 0.75 + 0.25 * sin(b.y * uRows * 6.28318), 0.35 * uScan);
  boot *= mix(0.55, 1.0, smoothstep(-0.4, 0.4, 0.6 - length(b - 0.5)));

  vec3 chrome = texture2D(tChrome, uv).rgb * (0.88 + 0.12 * sin(uv.y * 240.0 * 6.28318));
  vec3 face = mix(boot, chrome, smoothstep(0.25, 0.85, uMode)) + vec3(0.75, 1.0, 0.3) * tear * 0.05;

  vec2 luv = (vUv - uBand.xy) / uBand.zw;
  vec3 live = texture2D(tLive, clamp(luv, 0.0, 1.0)).rgb * inBand;
  vec3 col = mix(face, live, smoothstep(0.1, 0.55, uDive));

  float sheen = smoothstep(0.3, 0.0, abs(vUv.x * 0.8 + vUv.y * 0.6 - 0.8));
  col += vec3(0.03) * sheen * uFrame;
  gl_FragColor = vec4(col, 1.0);
}`;

export class HeroScene implements GLScene {
  readonly id = 'hero' as const;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(FOV, 1, 0.02, 80);
  boot = new BootScreen();

  /** Set by the stage each frame. */
  intro = 0;
  /** 0 = boot console, 1 = the terminal's own UI. */
  screenOn = 0;
  bootProgress = 0;
  bootReady = false;
  liveTexture: THREE.Texture | null = null;

  private device = new THREE.Group();
  private terminal: Terminal;
  private chrome = new ScreenChrome(SCREEN_W / SCREEN_H);
  private screen: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private constellation = new THREE.Group();
  private pointMat: THREE.ShaderMaterial;
  private lineMat: THREE.ShaderMaterial;
  private floorMat: THREE.ShaderMaterial;
  private blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  private reduced: boolean;
  private rangeLength: number;
  /** Camera distance at which the screen's band exactly fills the viewport. */
  private fill = 1;
  private restPos = new THREE.Vector3();
  private restLook = new THREE.Vector3();
  private pos = new THREE.Vector3();
  private look = new THREE.Vector3();

  constructor(ctx: SceneContext, rangeLength: number) {
    this.rangeLength = rangeLength;
    this.reduced = ctx.reduced;
    this.blank.needsUpdate = true;
    this.scene.background = PALETTE.bg.clone();

    this.screen = new THREE.Mesh(
      new THREE.PlaneGeometry(SCREEN_W, SCREEN_H),
      new THREE.ShaderMaterial({
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: SCREEN_FRAG,
        uniforms: {
          tBoot: { value: this.boot.texture },
          tLive: { value: this.blank },
          tChrome: { value: this.chrome.texture },
          uMode: { value: 0 },
          uDive: { value: 0 },
          uTime: { value: 0 },
          uBandAspect: { value: 1 },
          uRows: { value: 400 },
          uScan: { value: 1 },
          uFrame: { value: 0 },
          uBand: { value: new THREE.Vector4(0, 0, 1, 1) },
        },
      }),
    );
    this.terminal = new Terminal(this.screen, profile.name);
    this.device.add(this.terminal.group);
    this.scene.add(this.device);

    this.floorMat = new THREE.ShaderMaterial({
      ...INK_BLEND,
      uniforms: { uColor: { value: PALETTE.ink } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying vec3 vW;
        ${GLSL_INK}
        void main() {
          vec2 q = vW.xz * 1.25;
          vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
          float line = 1.0 - min(min(g.x, g.y), 1.0);
          float fade = exp(-length(vW.xz - vec2(0.0, -1.5)) * 0.3);
          gl_FragColor = ink(uColor, line * fade * 0.22);
        }`,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.6;
    this.scene.add(floor);

    // Ink shadow under the floating device.
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.75, 48),
      new THREE.MeshBasicMaterial({ color: PALETTE.ink, transparent: true, opacity: 0.16, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(1.1, 0.45, 1);
    shadow.position.set(0.05, -1.595, -0.2);
    this.scene.add(shadow);

    const shared = { uTime: { value: 0 }, uDpr: { value: ctx.dpr }, uPointer: { value: new THREE.Vector2() }, uPointerForce: { value: 1 }, uAspect: { value: 1 } };
    const vert = (points: boolean) => /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uDpr;
      varying float vA;
      ${GLSL_POINTER}
      void main() {
        vec3 p = position;
        p.y += sin(uTime * 0.4 + aSeed * 20.0) * 0.06;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = repel(projectionMatrix * mv);
        ${points ? 'gl_PointSize = 2.6 * uDpr * (1.0 + aSeed) * (4.0 / -mv.z);' : ''}
        vA = ${points ? '(0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 1.3 + aSeed * 40.0)))' : '1.0'} * smoothstep(18.0, 3.0, -mv.z);
      }`;
    this.pointMat = new THREE.ShaderMaterial({
      ...INK_BLEND,
      uniforms: { ...shared, uColor: { value: PALETTE.ink } },
      vertexShader: vert(true),
      fragmentShader: `uniform vec3 uColor; varying float vA; ${GLSL_INK} void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = ink(uColor, a * a * vA * 0.6); }`,
    });
    this.lineMat = new THREE.ShaderMaterial({
      ...INK_BLEND,
      uniforms: { ...shared, uColor: { value: PALETTE.ink } },
      vertexShader: vert(false),
      fragmentShader: `uniform vec3 uColor; varying float vA; ${GLSL_INK} void main(){ gl_FragColor = ink(uColor, 0.08 * vA); }`,
    });
    this.buildConstellation(ctx.mobile ? 220 : 420);
    this.scene.add(this.constellation);

    // Flat, cel-style lighting: soft fill plus one key from the upper left.
    this.scene.add(new THREE.AmbientLight('#ffffff', 0.6));
    const key = new THREE.DirectionalLight('#fff6e8', 1.35);
    key.position.set(-0.8, 3, 5);
    this.scene.add(key);
  }

  private buildConstellation(count: number) {
    const rand = rng(7);
    const pts: THREE.Vector3[] = [];
    while (pts.length < count) {
      const v = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
      if (v.lengthSq() > 1) continue;
      v.normalize().multiplyScalar(5.5 + rand() * 8);
      v.y *= 0.55;
      if (v.z > 2) v.z *= -1;
      pts.push(v);
    }
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    pts.forEach((p, i) => {
      p.toArray(pos, i * 3);
      seed[i] = rand();
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.constellation.add(new THREE.Points(g, this.pointMat));

    const lp: number[] = [];
    const ls: number[] = [];
    pts.forEach((a, i) => {
      let links = 0;
      for (let j = i + 1; j < pts.length && links < 2; j++) {
        if (a.distanceTo(pts[j]) < 1.6) {
          lp.push(a.x, a.y, a.z, pts[j].x, pts[j].y, pts[j].z);
          ls.push(seed[i], seed[j]);
          links++;
        }
      }
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    lg.setAttribute('aSeed', new THREE.Float32BufferAttribute(ls, 1));
    this.constellation.add(new THREE.LineSegments(lg, this.lineMat));
  }

  resize(ctx: SceneContext) {
    const aspect = ctx.width / ctx.height;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    // Largest viewport-shaped band that fits inside the screen.
    const wide = aspect > SCREEN_W / SCREEN_H;
    const bw = wide ? SCREEN_W : SCREEN_H * aspect;
    const bh = wide ? SCREEN_W / aspect : SCREEN_H;
    this.fill = bh / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));

    this.boot.resize(aspect, ctx.mobile);
    const u = this.screen.material.uniforms;
    u.tBoot.value = this.boot.texture;
    u.uBandAspect.value = aspect;
    u.uRows.value = this.boot.texture.image.height;
    (u.uBand.value as THREE.Vector4).set((SCREEN_W - bw) / 2 / SCREEN_W, (SCREEN_H - bh) / 2 / SCREEN_H, bw / SCREEN_W, bh / SCREEN_H);
    this.pointMat.uniforms.uAspect.value = aspect;
    this.pointMat.uniforms.uDpr.value = ctx.dpr;

    // Resting composition: a three-quarter view from the upper right, beside
    // the headline on desktop and above it on portrait screens.
    if (ctx.mobile && aspect < 1) {
      this.restPos.set(1.1, 0.5, 9.4);
      this.restLook.set(0.2, -1.75, 0);
    } else {
      // Viewed from the right, so the screen turns toward the headline on the left.
      this.restPos.set(0.55, 0.7, 4.9);
      this.restLook.set(-1.38, -0.3, 0);
    }
  }

  update(f: FrameState) {
    if (this.screenOn < 1) this.boot.draw(this.bootProgress, f.time, this.bootReady);
    if (this.screenOn > 0) this.chrome.draw(f.time, this.reduced);
    this.terminal.update(f.dt, this.reduced);

    const out = easeInOutCubic(clamp(this.intro));
    const dive = easeInOutCubic(clamp((f.progress * this.rangeLength) / DIVE_END));
    // a = 0: the screen's band exactly fills the viewport.
    const a = out * (1 - dive);

    this.pos.set(0, 0, this.fill).lerp(this.restPos, a);
    this.look.set(0, 0, 0).lerp(this.restLook, a);
    this.pos.x += f.pointer.x * 0.35 * a;
    this.pos.y += f.pointer.y * 0.2 * a;
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.look);

    this.device.position.y = Math.sin(f.time * 0.6) * 0.04 * a;
    this.device.rotation.y = (-0.12 + f.pointer.x * 0.1) * a;
    this.device.rotation.x = -f.pointer.y * 0.05 * a;
    this.device.rotation.z = Math.sin(f.time * 0.45) * 0.015 * a;

    this.constellation.rotation.y = f.time * 0.012 + f.pointer.x * 0.08;
    this.constellation.rotation.x = -f.pointer.y * 0.04;

    const u = this.screen.material.uniforms;
    u.uTime.value = f.time;
    u.uMode.value = this.screenOn;
    u.uDive.value = dive;
    u.uScan.value = 1 - out;
    u.uFrame.value = a * this.screenOn;
    u.tLive.value = this.liveTexture ?? this.blank;

    // Points and lines share these uniform objects.
    this.pointMat.uniforms.uTime.value = f.time;
    (this.pointMat.uniforms.uPointer.value as THREE.Vector2).set(f.pointer.x, f.pointer.y);
  }

  dispose() {
    disposeScene(this.scene);
    this.terminal.dispose();
    this.boot.dispose();
    this.chrome.dispose();
    this.blank.dispose();
  }
}
