// Reusable painted set pieces: ground with hills, wind-blown grass, trees, rocks. Owned by set & FX.
// Everything is seeded and posed from world time (PROPS.time), so a frozen world freezes the wind too.
import * as THREE from 'three';
import { paintedMaterial } from './shade.js';
import { rng } from '/engine/motion.js';

export const PROPS = { time: { value: 0 } };

// Gentle rolling hills. groundY(x, z) is the height characters and props stand on.
export function makeGround({ size = 240, seg = 160, hills = 0.6, flat = [0, 0, 6], color = '#5f8f3a', seed = 3 } = {}) {
  const r = rng(seed), waves = Array.from({ length: 6 }, () => [r() * 6.28, 0.03 + r() * 0.08, 0.03 + r() * 0.08, 0.3 + r() * 0.7]);
  const groundY = (x, z) => {
    let y = 0;
    for (const [ph, fx, fz, a] of waves) y += Math.sin(x * fx + ph) * Math.cos(z * fz - ph) * a * hills;
    const d = Math.hypot(x - flat[0], z - flat[1]);
    return y * Math.min(1, Math.max(0, (d - flat[2]) / 10));   // flat stage around `flat`
  };
  const g = new THREE.PlaneGeometry(size, size, seg, seg);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, groundY(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, paintedMaterial({ color, brush: 0.45, scale: 1.4, stretch: [1, 1, 0.35] }));
  mesh.receiveShadow = true;
  return { mesh, groundY };
}

// Instanced grass blades in an area, swaying in the wind (PROPS.time). colors: [base, tip].
export function makeGrass({ count = 12000, area = [-20, 20, -20, 20], groundY = () => 0, height = [0.25, 0.6], colors = ['#2f5a24', '#a8c95a'],
  avoid = () => false, seed = 11, wind = 1, heightAt = null } = {}) {
  const blade = new THREE.PlaneGeometry(0.035, 1, 1, 4);
  blade.translate(0, 0.5, 0);
  const pos = blade.attributes.position, col = [];
  const c0 = new THREE.Color(colors[0]), c1 = new THREE.Color(colors[1]);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    pos.setX(i, pos.getX(i) * (1 - y * 0.92));             // taper to a point
    const c = c0.clone().lerp(c1, y * y);
    col.push(c.r, c.g, c.b);
  }
  blade.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  blade.computeVertexNormals();
  const mat = paintedMaterial({ color: '#ffffff', vertexColors: true, brush: 0.15, side: THREE.DoubleSide });
  const base = mat.onBeforeCompile;
  mat.onBeforeCompile = (s) => {
    base(s);
    s.uniforms.uTime = PROPS.time;
    s.uniforms.uWind = { value: wind };
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime, uWind;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec3 o = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          float k = position.y * position.y;
          float w = sin(uTime * 1.7 + o.x * 0.35 + o.z * 0.21) * 0.6 + sin(uTime * 3.1 + o.x * 1.3) * 0.25;
          transformed.x += w * 0.18 * k * uWind;
          transformed.z += w * 0.08 * k * uWind;
        }`);
    // grass normals point up: lit like the ground under it, not like a card
    s.vertexShader = s.vertexShader.replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);');
  };
  mat.customProgramCacheKey = () => 'grass';
  const r = rng(seed), mesh = new THREE.InstancedMesh(blade, mat, count), m = new THREE.Matrix4(), q = new THREE.Quaternion();
  let n = 0;
  for (let tries = 0; n < count && tries < count * 4; tries++) {
    const x = area[0] + r() * (area[1] - area[0]), z = area[2] + r() * (area[3] - area[2]);
    if (avoid(x, z)) continue;
    const h = (height[0] + r() * (height[1] - height[0])) * (heightAt ? heightAt(x, z) : 1);   // heightAt: mow the stage
    q.setFromEuler(new THREE.Euler((r() - 0.5) * 0.4, r() * 6.28, (r() - 0.5) * 0.4));
    m.compose(new THREE.Vector3(x, groundY(x, z) - 0.02, z), q, new THREE.Vector3(1 + r(), h, 1));
    mesh.setMatrixAt(n++, m);
  }
  mesh.count = n;
  mesh.receiveShadow = true;
  return mesh;
}

// Stylised tree: tapered trunk + clustered canopy with normals pointing out of the canopy centre (soft, painterly volume).
export function makeTree({ height = 5, radius = 1.8, trunk = '#5b3b2a', leaves = '#4f8a3a', seed = 5, kind = 'round' } = {}) {
  const r = rng(seed), g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * height / 5, 0.22 * height / 5, height * 0.6, 8), paintedMaterial({ color: trunk, brush: 0.3, stretch: [3, 0.2, 3] }));
  t.position.y = height * 0.3;
  t.castShadow = t.receiveShadow = true;
  g.add(t);
  if (kind === 'pine') {
    for (let i = 0; i < 4; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(radius * (1 - i * 0.2), height * 0.35, 9), paintedMaterial({ color: leaves, brush: 0.4 }));
      c.position.y = height * (0.42 + i * 0.16);
      c.rotation.y = r() * 6.28;
      c.castShadow = c.receiveShadow = true;
      g.add(c);
    }
    return g;
  }
  const parts = [], center = new THREE.Vector3(0, height * 0.72, 0);
  for (let i = 0; i < 7; i++) {
    const s = radius * (0.45 + r() * 0.35);
    const b = new THREE.IcosahedronGeometry(s, 2);
    b.translate((r() - 0.5) * radius, height * 0.62 + r() * radius * 0.8, (r() - 0.5) * radius);
    parts.push(b);
  }
  for (const b of parts) {
    const p = b.attributes.position, n = b.attributes.normal, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.set(p.getX(i), p.getY(i), p.getZ(i)).sub(center).normalize();
      n.setXYZ(i, v.x, v.y, v.z);
    }
    const c = new THREE.Mesh(b, paintedMaterial({ color: leaves, brush: 0.5, scale: 3 }));
    c.castShadow = c.receiveShadow = true;
    g.add(c);
  }
  return g;
}

export function makeRock({ size = 0.6, color = '#8a8478', seed = 9 } = {}) {
  const r = rng(seed), geo = new THREE.IcosahedronGeometry(size, 1), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 0.8 + r() * 0.35;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.7, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, paintedMaterial({ color, brush: 0.5 }));
  m.castShadow = m.receiveShadow = true;
  return m;
}
