import * as THREE from 'three';
import { BOOT_EFFECTS, RANGES, rangeIndexAt, stickyProgress, type Effects, type SectionId } from '../data/sections';
import { intro, loading } from '../core/loading';
import { pointer } from '../core/pointer';
import { jumpState, scrollState } from '../core/scroll';
import { env, phaseStore } from '../core/state';
import { clamp, damp, easeInOutCubic, lerp, ticker } from '../core/ticker';
import {
  EFFECT_KEYS, FullscreenPass, createBlurMaterial, createBrightMaterial, createFinalMaterial, createMixMaterial, mixEffects,
} from './post';
import { AutomationScene } from './scenes/AutomationScene';
import { CortexScene } from './scenes/CortexScene';
import { EliteScene } from './scenes/EliteScene';
import { FieldScene } from './scenes/FieldScene';
import { HeroScene } from './scenes/HeroScene';
import { IlluxusScene } from './scenes/IlluxusScene';
import { PALETTE, type FrameState, type GLScene, type SceneContext } from './types';

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const smooth = (t: number) => t * t * (3 - 2 * t);

function measure(): SceneContext {
  const mobile = env.mobile;
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75),
    mobile,
    reduced: env.reduced,
  };
}

function makeScene(id: SectionId, ctx: SceneContext): GLScene {
  const { accent, ink, grey, steel } = PALETTE;
  switch (id) {
    case 'hero':
      return new HeroScene(ctx, RANGES[0].length);
    case 'about':
      return new FieldScene('about', {
        mode: 'drift', count: 1500, seed: 3, colorA: ink, colorB: accent, lines: true, size: 4,
        morph: (f) => clamp(f.enter * 0.35 + f.sticky * 0.9),
        motion: (g, f) => {
          g.rotation.y = -0.45 + f.sticky * 0.7 + f.pointer.x * 0.1;
          g.rotation.x = 0.22 - f.pointer.y * 0.06;
        },
      }, ctx);
    case 'journey':
      return new FieldScene('journey', {
        mode: 'flow', columns: 3, count: 1200, seed: 41, colorA: grey, colorB: accent, alpha: 0.7,
        morph: (f) => clamp(f.enter * 0.5 + f.sticky * 3),
        stage: (f) => Math.min(2.99, f.sticky * 4),
        motion: (g, f) => {
          g.rotation.y = f.pointer.x * 0.08;
          g.rotation.x = -f.pointer.y * 0.05;
        },
      }, ctx);
    case 'illuxus':
      return new IlluxusScene(ctx);
    case 'elite':
      return new EliteScene();
    case 'cortex':
      return new CortexScene(ctx);
    case 'automation':
      return new AutomationScene(ctx);
    case 'stack':
      return new FieldScene('stack', {
        mode: 'drift', count: 900, seed: 9, colorA: grey, colorB: steel, alpha: 0.55,
        morph: () => 0.32,
        motion: (g, f) => {
          g.rotation.y = f.time * 0.03 + f.pointer.x * 0.06;
          g.rotation.x = 0.3;
        },
      }, ctx);
    case 'process':
      return new FieldScene('process', {
        mode: 'flow', count: 1600, seed: 17, colorA: grey, colorB: accent,
        morph: (f) => clamp(f.enter * 0.4 + f.sticky * 4),
        stage: (f) => Math.min(4.99, f.sticky * 5),
        motion: (g, f) => {
          g.rotation.y = f.pointer.x * 0.08;
          g.rotation.x = -f.pointer.y * 0.05;
        },
      }, ctx);
    case 'contact':
      return new FieldScene('contact', {
        mode: 'converge', count: 1800, seed: 29, colorA: ink, colorB: accent, pointerForce: -0.8, frame: true,
        morph: (f) => clamp(f.enter * 1.1),
        motion: (g, f) => {
          g.rotation.y = f.time * 0.05 + f.pointer.x * 0.15;
          g.rotation.x = -f.pointer.y * 0.1;
        },
      }, ctx);
  }
}

/**
 * Renders the current (and, while transitioning, the next) section scene into
 * offscreen targets, blends them, then runs bloom and the final lens pass.
 */
export async function createStage(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' });
  renderer.setClearColor(PALETTE.bg, 1);
  renderer.toneMapping = THREE.NoToneMapping;

  let ctx = measure();
  renderer.setPixelRatio(ctx.dpr);
  renderer.setSize(ctx.width, ctx.height, false);

  const size = () => [Math.round(ctx.width * ctx.dpr), Math.round(ctx.height * ctx.dpr)] as const;
  const [W, H] = size();
  const sceneRT = () => new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: ctx.mobile ? 0 : 4 });
  const flatRT = (w: number, h: number) => new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: false });
  const rtCur = sceneRT();
  const rtNext = sceneRT();
  const rtMix = flatRT(W, H);
  const bloomA = flatRT(W >> 2, H >> 2);
  const bloomB = flatRT(W >> 2, H >> 2);

  const pass = new FullscreenPass();
  const mixMat = createMixMaterial();
  const brightMat = createBrightMaterial();
  const blurMat = createBlurMaterial();
  const finalMat = createFinalMaterial();
  finalMat.uniforms.uBg.value = PALETTE.bg.clone().multiplyScalar(0.93);

  // Ticket and boot canvases draw text; wait (briefly) for webfonts.
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);

  const scenes: GLScene[] = [];
  for (const r of RANGES) {
    const s = makeScene(r.id, ctx);
    s.resize(ctx);
    scenes.push(s);
    loading.done(`build:${r.id}`);
    await nextFrame();
  }
  const hero = scenes[0] as HeroScene;

  const frame: FrameState = { time: 0, dt: 0, progress: 0, sticky: 0, enter: 0, pointer: { x: 0, y: 0 }, velocity: 0 };

  // Compile shaders and upload buffers now, not mid-scroll.
  for (let i = 0; i < scenes.length; i++) {
    const s = scenes[i];
    s.update(frame);
    await renderer.compileAsync(s.scene, s.camera);
    renderer.setRenderTarget(rtCur);
    renderer.render(s.scene, s.camera);
    loading.done(`warm:${RANGES[i].id}`);
    await nextFrame();
  }
  for (const m of [mixMat, brightMat, blurMat]) pass.render(renderer, m, bloomA);

  const live: Effects = { ...BOOT_EFFECTS };
  const target: Effects = { ...BOOT_EFFECTS };

  const fillFrame = (i: number, time: number, dt: number) => {
    const r = RANGES[i];
    const s = scrollState.s;
    frame.time = env.reduced ? time * 0.2 : time;
    frame.dt = dt;
    frame.progress = clamp((s - r.start) / r.length);
    frame.sticky = stickyProgress(r, s);
    frame.enter = clamp(s - (r.start - 1));
    frame.pointer.x = pointer.x;
    frame.pointer.y = pointer.y;
    frame.velocity = scrollState.velocity;
    return frame;
  };

  let firstFrame = true;
  const render = (time: number, dt: number) => {
    const phase = phaseStore.get();
    const s = scrollState.s;
    const i = phase === 'ready' ? rangeIndexAt(s) : 0;
    const cur = RANGES[i];
    const next = RANGES[i + 1];

    let blend = 0;
    if (next && next.enter === 'fade' && next.enterLength > 0) {
      blend = smooth(clamp((s - (cur.end - next.enterLength)) / next.enterLength));
    }

    // Post-processing look: section presets, blended and then damped.
    if (cur.id === 'hero' && phase !== 'ready') mixEffects(target, BOOT_EFFECTS, cur.effects, easeInOutCubic(intro.t));
    else if (next && blend > 0) mixEffects(target, cur.effects, next.effects, blend);
    else Object.assign(target, cur.effects);
    target.lens += Math.sin(blend * Math.PI) * 0.1 + jumpState.amount * 0.5;
    if (ctx.mobile) {
      target.lens *= 0.5;
      target.lensBorder *= 0.5;
    }
    const k = damp(6, dt);
    for (const key of EFFECT_KEYS) live[key] = lerp(live[key], target[key], k);

    const renderInto = (scene: GLScene, rt: THREE.WebGLRenderTarget) => {
      renderer.setRenderTarget(rt);
      renderer.render(scene.scene, scene.camera);
    };

    if (next && (blend > 0 || cur.id === 'hero')) {
      scenes[i + 1].update(fillFrame(i + 1, time, dt));
      renderInto(scenes[i + 1], rtNext);
    }
    if (cur.id === 'hero') {
      hero.intro = phase === 'loading' ? 0 : intro.t;
      hero.screenOn = phase === 'loading' ? 0 : clamp((intro.t - 0.1) / 0.45);
      hero.bootProgress = loading.value;
      hero.bootReady = loading.complete;
      hero.liveTexture = rtNext.texture;
    }
    scenes[i].update(fillFrame(i, time, dt));
    renderInto(scenes[i], rtCur);

    let src = rtCur.texture;
    if (blend > 0) {
      mixMat.uniforms.tA.value = rtCur.texture;
      mixMat.uniforms.tB.value = rtNext.texture;
      mixMat.uniforms.uBlend.value = blend;
      pass.render(renderer, mixMat, rtMix);
      src = rtMix.texture;
    }

    const [w, h] = size();
    if (live.bloom > 0.02) {
      brightMat.uniforms.tInput.value = src;
      brightMat.uniforms.uThreshold.value = live.bloomThreshold;
      (brightMat.uniforms.uTexel.value as THREE.Vector2).set(1 / w, 1 / h);
      pass.render(renderer, brightMat, bloomA);
      const dir = blurMat.uniforms.uDir.value as THREE.Vector2;
      const bw = 4 / w;
      const bh = 4 / h;
      for (const spread of [1, 2]) {
        blurMat.uniforms.tInput.value = bloomA.texture;
        dir.set(bw * spread, 0);
        pass.render(renderer, blurMat, bloomB);
        blurMat.uniforms.tInput.value = bloomB.texture;
        dir.set(0, bh * spread);
        pass.render(renderer, blurMat, bloomA);
      }
    }

    const u = finalMat.uniforms;
    u.tScene.value = src;
    u.tBloom.value = bloomA.texture;
    (u.uRes.value as THREE.Vector2).set(w, h);
    u.uTime.value = env.reduced ? 0 : time;
    u.uGrain.value = live.grain;
    u.uSepia.value = live.sepia;
    u.uSat.value = live.saturation;
    u.uContrast.value = live.contrast;
    u.uBright.value = live.brightness;
    u.uBloom.value = live.bloom > 0.02 ? live.bloom * 0.6 : 0;
    u.uChroma.value = live.chroma;
    u.uVig.value = live.vignette;
    u.uVigRadius.value = live.vignetteRadius;
    u.uLens.value = live.lens;
    u.uLensBorder.value = live.lensBorder;
    u.uVel.value = scrollState.velocity;
    u.uFade.value = jumpState.amount * 0.85;
    pass.render(renderer, finalMat, null);

    if (firstFrame) {
      firstFrame = false;
      canvas.classList.add('is-ready');
    }
  };
  ticker.add(render);

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      ctx = measure();
      renderer.setPixelRatio(ctx.dpr);
      renderer.setSize(ctx.width, ctx.height, false);
      const [w, h] = size();
      rtCur.setSize(w, h);
      rtNext.setSize(w, h);
      rtMix.setSize(w, h);
      bloomA.setSize(w >> 2, h >> 2);
      bloomB.setSize(w >> 2, h >> 2);
      scenes.forEach((s) => s.resize(ctx));
    }, 120);
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    document.documentElement.classList.add('no-gl');
  });
}
