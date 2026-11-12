// Film renderer: one frame = the average of N sub-renders, each shifted in time (motion blur), across the lens
// (depth of field) and by a fraction of a pixel (anti-aliasing). Owned by the integrator.
//
//   const film = new Film({ canvas, cut, scene, camera, update, grade });
//   window.seek = (t) => film.frame(t);
//
// update(worldT, ctx) poses the world for one sub-render. ctx = { t (film time of this sample), frameT (film time of
// the frame), shot, i, n, rand: seeded () => [0,1) for this sample }. Expensive things (SDF character meshes) should be
// posed from ctx.frameT and cached; cheap transforms (root motion, camera, particles) from the sample time.
// grade(t, shot) -> { exposure, lift:[r,g,b], gamma:[r,g,b], gain:[r,g,b], saturation, contrast, vignette, grain }
//
// Sub-renders never leave their own shot: the shutter is clamped to [shot.start, shot.end), so a cut never starts
// with a ghost of the previous shot. Any shader compile error or lost context sets window.__fatal and stops the render.
import * as THREE from 'three';
import { fovFor } from './cutlist.js';
import { rng } from '/engine/motion.js';

const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
const fract = (x) => x - Math.floor(x);

const QUAD_VS = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const GRADE_FS = /* glsl */`
  precision highp float;
  precision highp int;
  uniform sampler2D map;
  uniform float exposure, saturation, contrast, vignette, grain, seed, aspect;
  uniform vec3 lift, gamma, gain;
  varying vec2 vUv;
  float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423) + seed); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
  vec3 filmic(vec3 x) {                       // soft shoulder, keeps saturated paint colours from clipping to white
    x = max(x, 0.0);
    vec3 a = x * (1.0 + x / 6.0) / (1.0 + x);
    return a;
  }
  vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
  void main() {
    vec3 c = texture2D(map, vUv).rgb * exposure;
    c = filmic(c);
    c = pow(max(gain * (c + lift * (1.0 - c)), 0.0), 1.0 / gamma);   // ASC-CDL-like lift/gamma/gain
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, saturation);
    c = (c - 0.5) * contrast + 0.5;
    vec2 q = (vUv - 0.5) * vec2(aspect, 1.0);
    c *= 1.0 - vignette * smoothstep(0.35, 1.05, length(q) * 1.15);
    c = srgb(clamp(c, 0.0, 1.0));
    c += (hash(vUv * 1024.0) - 0.5) * grain;
    gl_FragColor = vec4(c, 1.0);
  }`;

export const DEFAULT_GRADE = { exposure: 1, lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], saturation: 1,
  contrast: 1, vignette: 0.25, grain: 0.012 };

export class Film {
  constructor({ canvas, cut, scene, camera, update, grade, width = innerWidth, height = innerHeight, draft }) {
    const q = new URLSearchParams(location.search);
    this.cut = cut; this.scene = scene; this.camera = camera; this.update = update;
    this.gradeFn = grade ?? (() => DEFAULT_GRADE);
    this.W = width; this.H = height;
    // ?samples=N overrides every shot (1 = draft). ?draft also means 1.
    this.forceSamples = q.has('samples') ? Number(q.get('samples')) : (draft ?? q.has('draft')) ? 1 : null;

    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true,
      precision: 'highp', powerPreference: 'high-performance' });
    r.setPixelRatio(1);
    r.setSize(width, height, false);
    r.outputColorSpace = THREE.LinearSRGBColorSpace;   // we encode sRGB ourselves in the grade pass
    r.toneMapping = THREE.NoToneMapping;
    r.autoClear = false;                               // the accumulation target must survive N quad draws
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.debug.checkShaderErrors = true;
    r.debug.onShaderError = (gl, program, vs, fs) => {
      const log = [gl.getShaderInfoLog(vs), gl.getShaderInfoLog(fs), gl.getProgramInfoLog(program)].filter(Boolean).join('\n');
      window.__fatal = 'shader compile error: ' + log.slice(0, 2000);
      console.error(window.__fatal);
    };
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); window.__fatal = 'webgl context lost'; });

    const rt = () => new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, depthBuffer: true,
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.sampleRT = rt();
    this.accumRT = rt();
    this.accumRT.depthBuffer = false;

    const quad = new THREE.PlaneGeometry(2, 2);
    this.addMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: null }, weight: { value: 1 } }, vertexShader: QUAD_VS,
      fragmentShader: `precision highp float; uniform sampler2D map; uniform float weight; varying vec2 vUv;
        void main() { gl_FragColor = vec4(texture2D(map, vUv).rgb * weight, 1.0); }`,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      depthTest: false, depthWrite: false });
    this.gradeMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.accumRT.texture }, exposure: { value: 1 }, saturation: { value: 1 }, contrast: { value: 1 },
        vignette: { value: 0 }, grain: { value: 0 }, seed: { value: 0 }, aspect: { value: width / height },
        lift: { value: new THREE.Vector3() }, gamma: { value: new THREE.Vector3(1, 1, 1) }, gain: { value: new THREE.Vector3(1, 1, 1) } },
      vertexShader: QUAD_VS, fragmentShader: GRADE_FS, depthTest: false, depthWrite: false });
    this.quadScene = new THREE.Scene();
    this.quad = new THREE.Mesh(quad, this.addMat);
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._q = new THREE.Quaternion(); this._m = new THREE.Matrix4(); this._up = new THREE.Vector3(0, 1, 0);
  }

  // Place the camera for one sub-render: lens offset (lx, ly in metres on the aperture) and pixel jitter (jx, jy in px).
  placeCamera(cam, lx = 0, ly = 0, jx = 0, jy = 0) {
    const c = this.camera, P = new THREE.Vector3(...cam.pos), T = new THREE.Vector3(...cam.target);
    c.position.copy(P);
    c.up.set(0, 1, 0);
    c.lookAt(T);
    if (cam.roll) c.rotateZ((cam.roll * Math.PI) / 180);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(c.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(c.quaternion);
    c.position.addScaledVector(right, lx).addScaledVector(up, ly);
    c.fov = fovFor(cam.focal, this.W, this.H);
    c.aspect = this.W / this.H;
    c.updateMatrixWorld(true);
    // Off-axis frustum: the lens moved, the focus plane did not.
    const n = c.near, f = c.far, top = n * Math.tan((c.fov * Math.PI) / 360), rt = top * c.aspect;
    const sx = (-lx * n) / cam.focus + (jx * 2 * rt) / this.W, sy = (-ly * n) / cam.focus + (jy * 2 * top) / this.H;
    c.projectionMatrix.makePerspective(-rt + sx, rt + sx, top + sy, -top + sy, n, f);
    c.projectionMatrixInverse.copy(c.projectionMatrix).invert();
    this._pxToWorld = (2 * top) / n / this.H;            // world size of one pixel at distance 1 (for ink lines)
  }

  // Draw film time t. Returns the number of sub-renders used.
  frame(t) {
    if (window.__fatal) throw new Error(window.__fatal);
    const fps = this.cut.fps, shot = this.cut.shotAt(t);
    const n = Math.max(1, this.forceSamples ?? shot.samples);
    const open = n > 1 ? (shot.shutter / 360) / fps : 0;
    const r = this.renderer, frameIndex = Math.round(t * fps);
    const rot = rng(frameIndex * 7919 + 17);                 // per-frame rotation of the low-discrepancy pattern
    const o = [rot(), rot(), rot(), rot(), rot()];
    const lo = shot.start, hi = shot.end - 1e-4;

    r.setRenderTarget(this.accumRT);
    r.setClearColor(0x000000, 0);
    r.clear(true, false, false);
    for (let i = 0; i < n; i++) {
      const u = n > 1 ? fract(halton(i + 1, 2) + o[0]) : 0.5;
      const ts = Math.min(hi, Math.max(lo, t + (u - 0.5) * open));   // clamp the shutter to this shot
      const cam = this.cut.camera(shot, ts);
      const sr = rng(frameIndex * 131 + i * 977 + 3);
      this.update(shot.world(ts), { t: ts, frameT: t, shot, i, n, rand: sr, cam });
      let lx = 0, ly = 0, jx = 0, jy = 0;
      if (n > 1) {
        const a = 2 * Math.PI * fract(halton(i + 1, 3) + o[1]), rad = Math.sqrt(fract(halton(i + 1, 5) + o[2]));
        const R = (cam.focal / cam.fstop) / 2 / 1000;            // aperture radius in metres
        lx = Math.cos(a) * rad * R; ly = Math.sin(a) * rad * R;
        jx = fract(halton(i + 1, 7) + o[3]) - 0.5; jy = fract(halton(i + 1, 11) + o[4]) - 0.5;
      }
      this.placeCamera(cam, lx, ly, jx, jy);
      this.onCamera?.(this.camera, this._pxToWorld, { t: ts, shot });
      r.setRenderTarget(this.sampleRT);
      r.setClearColor(this.scene.background?.isColor ? this.scene.background : new THREE.Color(0), 1);
      r.clear();
      r.render(this.scene, this.camera);
      this.quad.material = this.addMat;
      this.addMat.uniforms.map.value = this.sampleRT.texture;
      this.addMat.uniforms.weight.value = 1 / n;
      r.setRenderTarget(this.accumRT);
      r.render(this.quadScene, this.quadCam);
    }
    if (window.__fatal) throw new Error(window.__fatal);

    const g = { ...DEFAULT_GRADE, ...this.gradeFn(t, shot) }, U = this.gradeMat.uniforms;
    U.exposure.value = g.exposure; U.saturation.value = g.saturation; U.contrast.value = g.contrast;
    U.vignette.value = g.vignette; U.grain.value = g.grain; U.seed.value = (frameIndex % 997) * 0.01313;
    U.lift.value.set(...g.lift); U.gamma.value.set(...g.gamma); U.gain.value.set(...g.gain);
    this.quad.material = this.gradeMat;
    r.setRenderTarget(null);
    r.render(this.quadScene, this.quadCam);
    return n;
  }

  // Blank / lost-GPU check of the frame on screen: 8x8 pixel probes. The render driver retries a frame that fails.
  check() {
    const gl = this.renderer.getContext();
    if (gl.isContextLost()) return { ok: false, why: 'context lost' };
    if (window.__fatal) return { ok: false, why: window.__fatal };
    const px = new Uint8Array(4), vals = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      gl.readPixels(Math.floor(((x + 0.5) / 8) * this.W), Math.floor(((y + 0.5) / 8) * this.H), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      vals.push(px[0] + px[1] + px[2]);
    }
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const spread = Math.max(...vals) - Math.min(...vals);
    if (spread < 6) return { ok: false, why: `flat frame (mean ${(mean / 3).toFixed(0)})`, mean, spread };
    return { ok: true, mean, spread };
  }

  // Height in pixels of a world-space sphere (centre [x,y,z], radius) seen by camera state `cam` (ctx.cam in update):
  // drives mesh detail (close-ups get a finer SDF grid).
  screenHeight(cam, center, radius) {
    const d = Math.hypot(center[0] - cam.pos[0], center[1] - cam.pos[1], center[2] - cam.pos[2]);
    const tanV = Math.tan((fovFor(cam.focal, this.W, this.H) * Math.PI) / 360);
    return ((radius * 2) / Math.max(1e-3, d * tanV)) * (this.H / 2);
  }
}

// Preview loop and the render contract in one place: window.seek, window.DURATION, ?t= scrub, rAF only in preview.
export function mount(film, { duration }) {
  window.DURATION = duration;
  window.CUTS = film.cut.cuts();
  window.FPS = film.cut.fps;
  window.seek = (t) => { film.frame(t); };
  window.frameCheck = () => film.check();
  const q = new URLSearchParams(location.search);
  if (!q.has('render')) {
    const T = q.has('t') ? Number(q.get('t')) : null, t0 = performance.now();
    const loop = () => {
      const t = T ?? ((performance.now() - t0) / 1000) % duration;
      film.frame(Math.floor(t * film.cut.fps) / film.cut.fps);
      if (T === null) requestAnimationFrame(loop);
    };
    (window.ready ?? Promise.resolve()).then(loop);
  }
}
