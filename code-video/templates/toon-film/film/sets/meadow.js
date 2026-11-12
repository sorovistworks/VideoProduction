// SET & FX owns this file. A dusk meadow: Nib's round hut, a lantern, trees, grass, and the leaf gust
// (a cached fixed-step simulation, so the time-freeze and the rewind are just different world times).
import * as THREE from 'three';
import { makeGround, makeGrass, makeTree, makeRock, PROPS } from '/engine/toon/props.js';
import { paintedMaterial, glow } from '/engine/toon/shade.js';
import { cachedSim } from '/engine/toon/sim.js';
import { rng } from '/engine/motion.js';

export const HUT = [-2.4, -1.8];
export const NIB_AT = [0.4, 0.6];
export const LANTERN = [1.35, 0.15];
export const GUST_AT = 87 / 24;               // world time of the sneeze, on a frame (pose, sim and score all read it)

export function buildMeadow(scene) {
  const { mesh: ground, groundY } = makeGround({ color: '#5d8a3c', flat: [0, 0, 7] });
  scene.add(ground);

  // hut: straw walls, thatch cone, door, a lit round window
  const hut = new THREE.Group();
  const straw = paintedMaterial({ color: '#c9a25e', brush: 0.6, scale: 5, stretch: [0.6, 4, 0.6] });
  const walls = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 1.7, 28, 1, true), straw);
  walls.position.y = 0.85;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.85, 1.5, 28), paintedMaterial({ color: '#dcb35a', brush: 0.7, scale: 4, stretch: [3, 0.6, 3] }));
  roof.position.y = 2.35;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.15, 0.1), paintedMaterial({ color: '#6b4127', brush: 0.4, stretch: [0.3, 3, 0.3] }));
  door.position.set(0.55, 0.58, 1.18); door.rotation.y = 0.45;
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.24, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb15a').multiplyScalar(1.6) }));
  win.position.set(-0.55, 1.15, 1.2); win.rotation.y = -0.42;
  const winGlow = glow('#ff9d4a', 1.4, 0.55); winGlow.position.copy(win.position).add(new THREE.Vector3(-0.05, 0, 0.08));
  for (const m of [walls, roof, door]) { m.castShadow = m.receiveShadow = true; }
  walls.material.side = THREE.DoubleSide;
  hut.add(walls, roof, door, win, winGlow);
  hut.position.set(HUT[0], groundY(...HUT), HUT[1]);
  hut.rotation.y = 0.35;
  scene.add(hut);

  // lantern on a post: a real light source, so it is allowed to glow
  const lantern = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.5, 8), paintedMaterial({ color: '#4a3322', brush: 0.3 }));
  post.position.y = 0.75; post.castShadow = true;
  const iron = paintedMaterial({ color: '#2b2026', brush: 0.2 });
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb85c').multiplyScalar(1.25) }));
  lamp.position.y = 1.42;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.09, 12), iron); cap.position.y = 1.545; cap.castShadow = true;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.025, 12), iron); foot.position.y = 1.33;
  lantern.add(cap, foot);
  const lampGlow = glow('#ffb35c', 1.1, 0.8); lampGlow.position.y = 1.42;
  const lampLight = new THREE.PointLight('#ffae5a', 2.2, 5, 1.6); lampLight.position.y = 1.4;
  lantern.add(post, lamp, lampGlow, lampLight);
  lantern.position.set(LANTERN[0], groundY(...LANTERN), LANTERN[1]);
  scene.add(lantern);

  // trees and rocks, seeded; round trees near, pines far
  const r = rng(21);
  for (let i = 0; i < 26; i++) {
    const a = -2.2 + r() * 2.6, d = 9 + r() * 26, x = Math.cos(a) * d, z = Math.sin(a) * d - 2;
    const pine = d > 18 || r() < 0.3;
    const t = makeTree({ height: 4 + r() * 4, radius: 1.4 + r() * 1.2, kind: pine ? 'pine' : 'round', seed: 100 + i,
      leaves: pine ? '#2f5a3a' : ['#4f8a3a', '#5e9442', '#6f8f35'][i % 3] });
    t.position.set(x, groundY(x, z) - 0.05, z);
    t.rotation.y = r() * 6.28;
    scene.add(t);
  }
  for (let i = 0; i < 9; i++) {
    const x = (r() - 0.5) * 16, z = -1 - r() * 9;
    const k = makeRock({ size: 0.2 + r() * 0.45, seed: 300 + i });
    k.position.set(x, groundY(x, z), z);
    scene.add(k);
  }
  const avoid = (x, z) => Math.hypot(x - HUT[0], z - HUT[1]) < 1.45 || Math.hypot(x - NIB_AT[0], z - NIB_AT[1]) < 0.45;
  // the stage around Nib is mown short; grass gets taller towards the trees
  const heightAt = (x, z) => 0.35 + Math.min(1, Math.hypot(x - NIB_AT[0], z - NIB_AT[1]) / 9) * 0.9;
  scene.add(makeGrass({ count: 60000, area: [-14, 14, -14, 10], groundY, avoid, heightAt, height: [0.1, 0.32] }));

  // leaves: lying in the grass until the gust lifts them
  const N = 520, leafGeo = new THREE.CircleGeometry(0.042, 7);
  leafGeo.scale(1, 0.55, 1);
  const leaves = new THREE.InstancedMesh(leafGeo, paintedMaterial({ color: '#ffffff', brush: 0.2, side: THREE.DoubleSide }), N);
  const palette = ['#f09a3a', '#f3c04a', '#d8642e', '#e2c95a'].map((c) => new THREE.Color(c));
  for (let i = 0; i < N; i++) leaves.setColorAt(i, palette[i % 4]);
  leaves.frustumCulled = false;
  scene.add(leaves);

  const sim = cachedSim({
    dt: 1 / 240,
    init: () => {
      const s = { p: new Float32Array(N * 3), v: new Float32Array(N * 3), a: new Float32Array(N * 3), w: new Float32Array(N * 3), blown: 0 };
      const q = rng(77);
      for (let i = 0; i < N; i++) {
        const ang = -1.5 + q() * 2.4, d = 0.45 + q() * 2.0;      // mostly to Nib's sides, few towards the lens      // in front of Nib, mostly towards the camera side
        const x = NIB_AT[0] + Math.sin(ang) * d, z = NIB_AT[1] + Math.cos(ang) * d;
        s.p.set([x, groundY(x, z) + 0.03, z], i * 3);
        s.a.set([-Math.PI / 2 + (q() - 0.5) * 0.3, q() * 6.28, 0], i * 3);
        s.w.set([(q() - 0.5) * 14, (q() - 0.5) * 14, (q() - 0.5) * 14], i * 3);
      }
      return s;
    },
    step: (s, dt, t) => {
      if (!s.blown && t >= GUST_AT) {
        s.blown = 1;
        const q = rng(78);
        for (let i = 0; i < N; i++) {
          const dx = s.p[i * 3] - NIB_AT[0], dz = s.p[i * 3 + 2] - NIB_AT[1], d = Math.hypot(dx, dz) + 0.3;
          // a slow, floaty burst: at the freeze (0.7 s later) the leaves hang between the lens and Nib
          const k = (3.4 / (0.7 + d * 0.5)) * (0.6 + q() * 0.8);
          s.v[i * 3] = (dx / d) * k + (q() - 0.5) * 0.9;
          s.v[i * 3 + 1] = 1.4 + (q() * 2.6) / (0.6 + d * 0.35);
          s.v[i * 3 + 2] = (dz / d) * k + (q() - 0.5) * 0.9;
        }
      }
      if (!s.blown) return;
      for (let i = 0; i < N; i++) {
        const o = i * 3, y0 = groundY(s.p[o], s.p[o + 2]) + 0.02;
        if (s.p[o + 1] <= y0 && s.v[o + 1] <= 0) { s.v[o] *= 0.8; s.v[o + 2] *= 0.8; s.v[o + 1] = 0; s.p[o + 1] = y0; continue; }
        const flutter = Math.sin(t * 9 + i * 1.7);
        s.v[o] += (-s.v[o] * 1.6 + flutter * 0.9) * dt;
        s.v[o + 2] += (-s.v[o + 2] * 1.6 + Math.cos(t * 7 + i) * 0.9) * dt;
        s.v[o + 1] += (-3.2 - s.v[o + 1] * 1.4) * dt;          // light: heavy drag, slow fall
        for (let k = 0; k < 3; k++) { s.p[o + k] += s.v[o + k] * dt; s.a[o + k] += s.w[o + k] * dt; }
      }
    },
  });

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
  return {
    groundY,
    // world time -> set state (wind, leaves). Cheap: safe to call per sub-render.
    update(w) {
      PROPS.time.value = w;
      const s = sim.at(Math.max(0, w));
      for (let i = 0; i < N; i++) {
        const o = i * 3;
        e.set(s.a[o], s.a[o + 1], s.a[o + 2]);
        m.compose(P.set(s.p[o], s.p[o + 1], s.p[o + 2]), q.setFromEuler(e), one);
        leaves.setMatrixAt(i, m);
      }
      leaves.instanceMatrix.needsUpdate = true;
      lampLight.intensity = 2.2 * (0.92 + 0.08 * Math.sin(w * 11.3) * Math.sin(w * 3.7));
    },
  };
}
