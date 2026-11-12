// The look: a painted world, clean toon characters, a colour script. Owned by lighting.
//
// World: one motivated key light per shot, brush texture only where light falls, flat coloured shadows (the ambient
// colour), painted sky, layers of haze (fog). Characters: two tones, a soft terminator, an ink outline, ink lines
// where paints meet. Glow only on real light sources (glow()).
//
//   const look = createLook(scene);                  // key + ambient lights, sky dome, fog
//   look.apply(paletteAt(script, t));                // per frame, from the colour script
//   mesh.material = toonMaterial();                  // SDF characters (vertex colours + ink attribute)
//   addInk(mesh);                                    // inverted-hull outline, constant pixel width
//   new THREE.Mesh(geo, paintedMaterial({ color: '#7fae4a' }))
//   film.onCamera = inkHook;                         // keeps outline widths in pixels
import * as THREE from 'three';

export const TOON = {
  uniforms: {
    pxToWorld: { value: 0.001 },               // world size of a pixel at distance 1 (set by inkHook every sub-render)
    ink: { value: new THREE.Color('#1d1420') },
    silhouette: { value: 0 },                  // 1 = silhouette test: characters black, world white
  },
};
export const inkHook = (camera, pxToWorld) => { TOON.uniforms.pxToWorld.value = pxToWorld; };

function ramp(lo, hi, shadow = 0) {
  const n = 256, data = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1), s = Math.min(1, Math.max(0, (x - lo) / (hi - lo))), v = shadow + (1 - shadow) * s * s * (3 - 2 * s);
    data.set([v * 255, v * 255, v * 255, 255], i * 4);
  }
  const t = new THREE.DataTexture(data, n, 1);
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
// toon coord = dot(N, L) * 0.5 + 0.5, so 0.5 is the terminator
const CHAR_RAMP = ramp(0.49, 0.56);
const WORLD_RAMP = ramp(0.46, 0.6);

const NOISE = /* glsl */`
  float h3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float vnoise(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
`;

// Characters: vertex colours, soft two-tone, ink lines where paints meet (from the SDF mesh's `edge` attribute).
// inkPx = line half-width in pixels.
export function toonMaterial({ color = '#ffffff', vertexColors = true, inkPx = 1.25 } = {}) {
  const m = new THREE.MeshToonMaterial({ color, vertexColors, gradientMap: CHAR_RAMP });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, { uInk: TOON.uniforms.ink, uSil: TOON.uniforms.silhouette });
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float edge;\nvarying float vEdge;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEdge = edge;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uInk;\nuniform float uSil;\nvarying float vEdge;')
      .replace('#include <opaque_fragment>', `
        float edgePx = abs(vEdge) / max(fwidth(vEdge), 1e-6);              // distance to the paint line in pixels
        outgoingLight = mix(outgoingLight, uInk, 1.0 - smoothstep(${(inkPx - 0.6).toFixed(2)}, ${(inkPx + 0.6).toFixed(2)}, edgePx));
        outgoingLight = mix(outgoingLight, vec3(0.0), uSil);
        #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'toon-char-' + inkPx;
  return m;
}

// Props held by characters (no ink attribute): same two-tone shading.
export function toonFlat(color) {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: CHAR_RAMP });
  m.onBeforeCompile = (s) => {
    s.uniforms.uSil = TOON.uniforms.silhouette;
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uSil;')
      .replace('#include <opaque_fragment>', 'outgoingLight = mix(outgoingLight, vec3(0.0), uSil);\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => 'toon-flat';
  return m;
}

// Inverted-hull outline with a constant pixel width. Call after the mesh's geometry exists; follows geometry swaps.
const INK_MAT = new THREE.ShaderMaterial({
  uniforms: { uPx: { value: 2.2 }, uPxToWorld: TOON.uniforms.pxToWorld, uInk: TOON.uniforms.ink },
  vertexShader: /* glsl */`
    uniform float uPx, uPxToWorld;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vec3 n = normalize(normalMatrix * normal);
      mv.xyz += n * uPx * uPxToWorld * max(0.2, -mv.z);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: 'uniform vec3 uInk; void main() { gl_FragColor = vec4(uInk, 1.0); }',
  side: THREE.BackSide,
});
export function addInk(mesh, px = 2.2) {
  const mat = px === 2.2 ? INK_MAT : INK_MAT.clone();
  if (mat !== INK_MAT) { mat.uniforms.uPx = { value: px }; mat.uniforms.uPxToWorld = TOON.uniforms.pxToWorld; mat.uniforms.uInk = TOON.uniforms.ink; }
  const hull = new THREE.Mesh(mesh.geometry, mat);
  hull.name = 'ink';
  hull.castShadow = false;
  mesh.userData.ink = hull;
  mesh.add(hull);
  return hull;
}
// Swap a character mesh's geometry (new pose) and keep its outline in step.
export function setGeometry(mesh, geo) {
  mesh.geometry = geo;
  if (mesh.userData.ink) mesh.userData.ink.geometry = geo;
}

// World surfaces: brush texture where light falls, flat colour in shadow.
// side: THREE.DoubleSide for cards (grass, leaves): both faces are lit like the front, never dark on the back.
export function paintedMaterial({ color = '#888888', brush = 0.35, scale = 2.2, stretch = [1, 0.3, 1], vertexColors = false, side } = {}) {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: WORLD_RAMP, vertexColors, side: side ?? THREE.FrontSide });
  m.onBeforeCompile = (s) => {
    if (side === THREE.DoubleSide) s.fragmentShader = s.fragmentShader.replace('#include <normal_fragment_begin>',
      THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0'));
    Object.assign(s.uniforms, { uBrush: { value: brush }, uScale: { value: scale }, uStretch: { value: new THREE.Vector3(...stretch) },
      uSil: TOON.uniforms.silhouette });
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 wp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix * wp;
        #endif
        vWPos = (modelMatrix * wp).xyz;`);
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>
        uniform float uBrush, uScale, uSil; uniform vec3 uStretch; varying vec3 vWPos;
        ${NOISE}`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        {
          vec3 q = vWPos * uScale * uStretch;
          float b = fbm(q) * 0.65 + vnoise(q * vec3(6.0, 1.2, 6.0)) * 0.35;     // big strokes + streaks
          float lit = clamp(dot(reflectedLight.directDiffuse, vec3(1.0)) / max(dot(diffuseColor.rgb, vec3(1.0)), 1e-3), 0.0, 1.0);
          reflectedLight.directDiffuse *= 1.0 + uBrush * (b - 0.5) * 2.0 * lit;
          reflectedLight.indirectDiffuse *= 1.0 + 0.25 * uBrush * (b - 0.5);
        }`)
      .replace('#include <opaque_fragment>', 'outgoingLight = mix(outgoingLight, vec3(1.0), uSil);\n#include <opaque_fragment>');
  };
  m.customProgramCacheKey = () => `painted-${brush}-${scale}-${stretch}-${vertexColors}`;
  return m;
}

// Glow only on real light sources (lanterns, windows, the sun): an additive sprite.
let GLOW_TEX;
export function glow(color = '#ffcc88', size = 1, strength = 1) {
  if (!GLOW_TEX) {
    const n = 128, data = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const d = Math.hypot(x - n / 2 + 0.5, y - n / 2 + 0.5) / (n / 2), v = Math.max(0, 1 - d) ** 2.2;
      data.set([255, 255, 255, v * 255], (y * n + x) * 4);
    }
    GLOW_TEX = new THREE.DataTexture(data, n, n); GLOW_TEX.minFilter = GLOW_TEX.magFilter = THREE.LinearFilter; GLOW_TEX.needsUpdate = true;
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX, color: new THREE.Color(color).multiplyScalar(strength),
    blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.set(size, size, 1);
  return s;
}

// ---------- sky, lights, fog: one rig per film ----------
const SKY_FS = /* glsl */`
  precision highp float;
  precision highp int;
  uniform vec3 top, horizon, below, sunColor, sunDir, cloudLit, cloudShade;
  uniform float cover, cloudSoft, sunSize, drift, uSil;
  varying vec3 vDir;
  ${NOISE}
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 c = mix(horizon, top, smoothstep(0.0, 0.55, h));
    c = mix(below, c, smoothstep(-0.25, 0.02, h));
    float sd = max(dot(d, normalize(sunDir)), 0.0);
    c += sunColor * (pow(sd, 18.0) * 0.6 + smoothstep(1.0 - sunSize, 1.0 - sunSize * 0.6, sd) * 2.0);
    if (h > -0.02) {                                     // painted cumulus on a dome
      // big soft cumulus: low-frequency body, a little edge detail, stretched along the horizon
      vec2 uv = d.xz / (h + 0.22) * vec2(0.32, 0.55) + vec2(drift, 0.0);
      float n = fbm(vec3(uv, 0.0)) * 1.25 - 0.12 + 0.12 * vnoise(vec3(uv * 6.0, 5.0));
      float m = smoothstep(1.0 - cover, 1.0 - cover + cloudSoft, n) * smoothstep(-0.02, 0.1, h);
      vec2 sdir = normalize(sunDir.xz + 1e-4);
      vec2 uv2 = uv - sdir * 0.05;
      float lit = n - (fbm(vec3(uv2, 0.0)) * 1.25 - 0.12 + 0.12 * vnoise(vec3(uv2 * 6.0, 5.0)));
      float band = smoothstep(-0.01, 0.02, lit);          // two painted tones with a soft edge
      vec3 cc = mix(cloudShade, cloudLit, band);
      c = mix(c, cc, m);
    }
    gl_FragColor = vec4(mix(c, vec3(1.0), uSil), 1.0);
  }`;

export function createLook(scene, { shadowSize = 24, shadowMap = 2048 } = {}) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), new THREE.ShaderMaterial({
    uniforms: Object.fromEntries(['top', 'horizon', 'below', 'sunColor', 'cloudLit', 'cloudShade'].map((k) => [k, { value: new THREE.Color() }])
      .concat([['sunDir', { value: new THREE.Vector3(0, 1, 0) }], ['cover', { value: 0.4 }], ['cloudSoft', { value: 0.035 }],
        ['sunSize', { value: 0.002 }], ['drift', { value: 0 }], ['uSil', TOON.uniforms.silhouette]])),
    vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false,
  }));
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  scene.add(sky);

  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(shadowMap, shadowMap);
  Object.assign(key.shadow.camera, { left: -shadowSize, right: shadowSize, top: shadowSize, bottom: -shadowSize, near: 0.5, far: 200 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 3;
  scene.add(key, key.target);
  const amb = new THREE.HemisphereLight(0x8899ff, 0x332233, 1);
  scene.add(amb);
  scene.fog = new THREE.FogExp2(0x888888, 0.01);
  scene.background = new THREE.Color(0);

  return {
    sky, key, amb,
    // focus = point the key light's shadow box follows (the action), e.g. the hero's position
    apply(p, focus = [0, 0, 0], skyAt = null) {
      const U = sky.material.uniforms, C = (k, v) => U[k].value.set(v);
      C('top', p.skyTop); C('horizon', p.skyHorizon); C('below', p.skyBelow ?? p.fog); C('sunColor', p.sun.color);
      C('cloudLit', p.cloudLit); C('cloudShade', p.cloudShade);
      U.cover.value = p.cloudCover ?? 0.4; U.sunSize.value = p.sun.size ?? 0.002; U.drift.value = p.drift ?? 0;
      const d = new THREE.Vector3(...p.sun.dir).normalize();
      U.sunDir.value.copy(d);
      key.color.set(p.sun.color); key.intensity = p.sun.intensity;
      key.target.position.set(...focus);
      key.position.copy(key.target.position).addScaledVector(d, 60);
      key.target.updateMatrixWorld();
      amb.color.set(p.ambientSky); amb.groundColor.set(p.ambientGround); amb.intensity = p.ambient;
      scene.fog.color.set(p.fog); scene.fog.density = p.fogDensity;
      scene.background.set(p.fog);
      if (skyAt) sky.position.set(...skyAt);
    },
  };
}

// ---------- colour script ----------
const isHex = (v) => typeof v === 'string' && v[0] === '#';
function mixAny(a, b, p) {
  if (isHex(a)) return '#' + new THREE.Color(a).lerp(new THREE.Color(b), p).getHexString();
  if (typeof a === 'number') return a + (b - a) * p;
  if (Array.isArray(a)) return a.map((x, i) => mixAny(x, b[i], p));
  if (a && typeof a === 'object') return Object.fromEntries(Object.keys(a).map((k) => [k, k in b ? mixAny(a[k], b[k], p) : a[k]]));
  return p < 0.5 ? a : b;
}
export const mixPalette = (a, b, p) => mixAny(a, b, Math.min(1, Math.max(0, p)));

// script: [{ at: seconds, palette: {...}, blend: seconds (crossfade from the previous one) }, ...] sorted by `at`.
export function paletteAt(script, t) {
  let cur = script[0].palette;
  for (let i = 1; i < script.length; i++) {
    const s = script[i];
    if (t < s.at) break;
    const p = s.blend ? (t - s.at) / s.blend : 1;
    const sm = p >= 1 ? 1 : p * p * (3 - 2 * p);
    cur = mixPalette(cur, s.palette, sm);
  }
  return cur;
}
