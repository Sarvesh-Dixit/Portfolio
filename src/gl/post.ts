import * as THREE from 'three';
import type { Effects } from '../data/sections';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

/** One oversized triangle; cheaper than a quad and has no diagonal seam. */
export class FullscreenPass {
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private mesh: THREE.Mesh;

  constructor() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    this.mesh = new THREE.Mesh(g);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  render(renderer: THREE.WebGLRenderer, material: THREE.Material, target: THREE.WebGLRenderTarget | null) {
    this.mesh.material = material;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.mesh.geometry.dispose();
  }
}

const mat = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
  new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });

export function createMixMaterial() {
  return mat(
    /* glsl */ `
    uniform sampler2D tA; uniform sampler2D tB; uniform float uBlend;
    varying vec2 vUv;
    void main() { gl_FragColor = mix(texture2D(tA, vUv), texture2D(tB, vUv), uBlend); }`,
    { tA: { value: null }, tB: { value: null }, uBlend: { value: 0 } },
  );
}

/** Threshold + 4-tap downsample into the bloom chain. */
export function createBrightMaterial() {
  return mat(
    /* glsl */ `
    uniform sampler2D tInput; uniform vec2 uTexel; uniform float uThreshold;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tInput, vUv + uTexel * vec2(-1.0, -1.0)).rgb
             + texture2D(tInput, vUv + uTexel * vec2( 1.0, -1.0)).rgb
             + texture2D(tInput, vUv + uTexel * vec2(-1.0,  1.0)).rgb
             + texture2D(tInput, vUv + uTexel * vec2( 1.0,  1.0)).rgb;
      c *= 0.25;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c *= smoothstep(uThreshold, uThreshold + 0.3, l);
      gl_FragColor = vec4(c, 1.0);
    }`,
    { tInput: { value: null }, uTexel: { value: new THREE.Vector2() }, uThreshold: { value: 0.5 } },
  );
}

export function createBlurMaterial() {
  return mat(
    /* glsl */ `
    uniform sampler2D tInput; uniform vec2 uDir;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tInput, vUv).rgb * 0.227027;
      c += (texture2D(tInput, vUv + uDir * 1.3846).rgb + texture2D(tInput, vUv - uDir * 1.3846).rgb) * 0.3162162;
      c += (texture2D(tInput, vUv + uDir * 3.2307).rgb + texture2D(tInput, vUv - uDir * 3.2307).rgb) * 0.0702703;
      gl_FragColor = vec4(c, 1.0);
    }`,
    { tInput: { value: null }, uDir: { value: new THREE.Vector2() } },
  );
}

/**
 * The look of the site: barrel lens with rounded CRT borders, chromatic
 * aberration, scroll-velocity smear, bloom, grade, vignette and film grain.
 */
export function createFinalMaterial() {
  return mat(
    /* glsl */ `
    uniform sampler2D tScene; uniform sampler2D tBloom;
    uniform vec2 uRes; uniform float uTime;
    uniform float uGrain, uSepia, uSat, uContrast, uBright, uBloom, uChroma;
    uniform float uVig, uVigRadius, uLens, uLensBorder, uVel, uFade;
    uniform vec3 uBg;
    varying vec2 vUv;

    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float sdRound(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }

    void main() {
      float aspect = uRes.x / uRes.y;
      vec2 c = vUv - 0.5;
      float k = uLens;
      vec2 d = c * (1.0 + k * dot(c, c) * 2.0);
      // Without borders, zoom so the distorted corners still fill the frame.
      d *= mix(1.0 / (1.0 + k), 1.0 + 0.025 * uLensBorder, uLensBorder);
      vec2 uv = d + 0.5;

      float sd = sdRound(d * vec2(aspect, 1.0), vec2(0.5 * aspect, 0.5), 0.045 * uLensBorder + 1e-4);
      float aa = 1.5 / uRes.y;
      float mask = 1.0 - smoothstep(-aa, aa, sd);

      vec2 ca = d * uChroma * 0.006;
      vec2 vo = vec2(0.0, uVel * 0.008);
      vec3 col;
      col.r = texture2D(tScene, uv + ca + vo * 0.5).r;
      col.g = texture2D(tScene, uv).g;
      col.b = texture2D(tScene, uv - ca - vo * 0.5).b;
      vec3 smear = (texture2D(tScene, uv + vo).rgb + texture2D(tScene, uv - vo).rgb) * 0.5;
      col = mix(col, smear, min(abs(uVel) * 0.6, 0.5));
      col += texture2D(tBloom, uv).rgb * uBloom;

      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      vec3 sep = vec3(dot(col, vec3(0.393, 0.769, 0.189)), dot(col, vec3(0.349, 0.686, 0.168)), dot(col, vec3(0.272, 0.534, 0.131)));
      col = mix(col, sep, uSepia);
      col = mix(vec3(l), col, uSat);
      col = max((col - 0.18) * uContrast + 0.18, 0.0) * uBright;

      float vd = length(c) * 1.4142;
      col *= 1.0 - uVig * smoothstep(uVigRadius * 0.6, 1.05, vd);

      col = mix(uBg, col, mask);
      col = mix(col, uBg, uFade);
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
      float g = hash(vUv * uRes + fract(uTime * 7.31) * 113.0) - 0.5;
      gl_FragColor.rgb += g * 0.06 * uGrain;
    }`,
    {
      tScene: { value: null },
      tBloom: { value: null },
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uGrain: { value: 1 },
      uSepia: { value: 0 },
      uSat: { value: 1 },
      uContrast: { value: 1 },
      uBright: { value: 1 },
      uBloom: { value: 1 },
      uChroma: { value: 1 },
      uVig: { value: 0.3 },
      uVigRadius: { value: 0.5 },
      uLens: { value: 0 },
      uLensBorder: { value: 0 },
      uVel: { value: 0 },
      uFade: { value: 0 },
      uBg: { value: new THREE.Color('#050605') },
    },
  );
}

export const EFFECT_KEYS: (keyof Effects)[] = [
  'grain', 'sepia', 'saturation', 'contrast', 'brightness', 'bloom',
  'bloomThreshold', 'chroma', 'vignette', 'vignetteRadius', 'lens', 'lensBorder',
];

export function mixEffects(out: Effects, a: Effects, b: Effects, t: number) {
  for (const k of EFFECT_KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
}
