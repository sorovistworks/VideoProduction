// Characters from maths: spheres, capsules, ellipsoids and boxes blended into one signed distance field,
// meshed per pose (surface nets) and cached. Owned by the character team.
//
//   const s = new Sculpt();
//   s.add(ellipsoid([0, .55, 0], [.38, .45, .34]), { paint: 'skin' });            // first shape: no blend
//   s.add(capsule([.3, .7, 0], [.5, .4, .1], .07), { k: .06, paint: 'skin' });    // k = blend radius (m)
//   s.cut(ellipsoid(mouthAt, mouthRadii), { k: .015, paint: 'mouth' });          // carved cavity, painted inside
//   s.paint('shirt', roundBox([0, .35, 0], [.5, .16, .5], .02));                 // clothes: a painted region
//   s.shadeFrom(ellipsoid(headC, headR), sphere(headC, .5), .05);                // face normals from a smooth head
//   const geo = s.mesh({ cell: .012, colors: { skin: '#f2a7a0', shirt: '#2f6f73', mouth: '#5a1a22' } });
//
// The geometry has `color` (linear) and `edge` (signed metres to the nearest paint change: the ink line) attributes.
// Use it with toonMaterial() from shade.js. Silhouette test: render with silhouette: true (see shade.js).
import * as THREE from 'three';

const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);

// Rotation from Euler degrees [x, y, z] -> inverse 3x3 (row-major) so we can map world -> local.
function invRot(rot) {
  if (!rot) return null;
  const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot.map((d) => (d * Math.PI) / 180))).invert();
  const e = m.elements;                     // column-major
  return [e[0], e[4], e[8], e[1], e[5], e[9], e[2], e[6], e[10]];
}
// ---------- primitives: { d(x,y,z), min:[..], max:[..] } ----------
// Hot path (millions of calls per pose): no allocations, scalars only.
const R0 = (R, x, y, z) => (R ? R[0] * x + R[1] * y + R[2] * z : x);
const R1 = (R, x, y, z) => (R ? R[3] * x + R[4] * y + R[5] * z : y);
const R2 = (R, x, y, z) => (R ? R[6] * x + R[7] * y + R[8] * z : z);

export function sphere(c, r) {
  const [cx, cy, cz] = c;
  return { d: (x, y, z) => Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2) - r, min: c.map((v) => v - r), max: c.map((v) => v + r) };
}
export function ellipsoid(c, rad, rot) {
  const R = invRot(rot), m = Math.max(...rad), [cx, cy, cz] = c, [ia, ib, ic] = rad.map((v) => 1 / v);
  const ia2 = ia * ia, ib2 = ib * ib, ic2 = ic * ic, rmin = Math.min(...rad);
  return {
    d: (x, y, z) => {
      const px = x - cx, py = y - cy, pz = z - cz;
      const a = R0(R, px, py, pz), b = R1(R, px, py, pz), e = R2(R, px, py, pz);
      const k0 = Math.sqrt((a * ia) ** 2 + (b * ib) ** 2 + (e * ic) ** 2), k1 = Math.sqrt((a * ia2) ** 2 + (b * ib2) ** 2 + (e * ic2) ** 2);
      return k1 < 1e-9 ? -rmin : (k0 * (k0 - 1)) / k1;
    }, min: c.map((v) => v - m), max: c.map((v) => v + m),
  };
}
// Round cone / capsule from a (radius ra) to b (radius rb). rb defaults to ra.
export function capsule(a, b, ra, rb = ra) {
  const [ax, ay, az] = a, bx = b[0] - ax, by = b[1] - ay, bz = b[2] - az, l2 = bx * bx + by * by + bz * bz || 1, L = Math.sqrt(l2);
  const r = Math.max(ra, rb), dr = rb - ra;
  return {
    d: (x, y, z) => {
      const px = x - ax, py = y - ay, pz = z - az;
      const h = Math.min(1, Math.max(0, (px * bx + py * by + pz * bz) / l2));
      // tapered: radius varies along the segment (good enough for limbs at these tapers)
      return Math.sqrt((px - bx * h) ** 2 + (py - by * h) ** 2 + (pz - bz * h) ** 2) - (ra + dr * h);
    },
    min: a.map((v, i) => Math.min(v, b[i]) - r), max: a.map((v, i) => Math.max(v, b[i]) + r), L,
  };
}
export function roundBox(c, half, r = 0, rot) {
  const R = invRot(rot), m = len3(...half) + r, [cx, cy, cz] = c, hx = half[0] - r, hy = half[1] - r, hz = half[2] - r;
  return {
    d: (x, y, z) => {
      const px = x - cx, py = y - cy, pz = z - cz;
      const qx = Math.abs(R0(R, px, py, pz)) - hx, qy = Math.abs(R1(R, px, py, pz)) - hy, qz = Math.abs(R2(R, px, py, pz)) - hz;
      const ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0, oz = qz > 0 ? qz : 0;
      return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - r;
    }, min: c.map((v) => v - m), max: c.map((v) => v + m),
  };
}
// Torus in the local XZ plane (rings, belts, hat bands).
export function torus(c, Rm, r, rot) {
  const R = invRot(rot), m = Rm + r, [cx, cy, cz] = c;
  return {
    d: (x, y, z) => {
      const px = x - cx, py = y - cy, pz = z - cz;
      const a = R0(R, px, py, pz), b = R1(R, px, py, pz), e = R2(R, px, py, pz);
      return Math.sqrt((Math.sqrt(a * a + e * e) - Rm) ** 2 + b * b) - r;
    },
    min: c.map((v) => v - m), max: c.map((v) => v + m),
  };
}

// Distance from a point to a box (0 inside): a lower bound of any primitive's distance inside that box.
function boxDist(x, y, z, mn, mx) {
  const dx = Math.max(mn[0] - x, 0, x - mx[0]), dy = Math.max(mn[1] - y, 0, y - mx[1]), dz = Math.max(mn[2] - z, 0, z - mx[2]);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Polynomial smooth min / max (k in metres).
export function smin(a, b, k) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
export const smax = (a, b, k) => -smin(-a, -b, k);

export class Sculpt {
  constructor() { this.parts = []; this.cuts = []; this.regions = []; this.shades = []; }
  add(prim, { k = 0, paint = 'base' } = {}) { this.parts.push({ prim, k, paint }); return this; }
  cut(prim, { k = 0, paint } = {}) { this.cuts.push({ prim, k, paint }); return this; }
  // A painted region: where prim < 0 (on the surface) the paint is `name`. Later regions win.
  paint(name, prim) { this.regions.push({ name, prim }); return this; }
  // Normals inside `mask` come from the smooth `shape` (one clean light/shadow edge on faces). soft = blend width (m).
  shadeFrom(shape, mask, soft = 0.04) { this.shades.push({ shape, mask, soft }); return this; }

  bodyDist(x, y, z) {
    const P = this.parts;
    let d = P[0].prim.d(x, y, z);
    for (let i = 1; i < P.length; i++) {
      const p = P[i];
      // a shape whose bounding box is farther than the blend reach cannot change d: skip it
      if (boxDist(x, y, z, p.prim.min, p.prim.max) - p.k > d) continue;
      d = smin(d, p.prim.d(x, y, z), p.k);
    }
    return d;
  }

  dist(x, y, z) {
    let d = this.bodyDist(x, y, z);
    for (const c of this.cuts) d = smax(d, -c.prim.d(x, y, z), c.k);
    return d;
  }

  // Paint at a surface point, and `edge`: signed distance (m) to the nearest line where the paint changes.
  // Signed so it interpolates smoothly through zero across triangles: the shader draws the ink line from it with
  // fwidth(), anti-aliased and a constant pixel width at any mesh resolution.
  paintAt(x, y, z) {
    let best = Infinity, second = Infinity, bp = 'base', sp = 'base';
    for (const p of this.parts) {
      const d = p.prim.d(x, y, z);
      if (d < best) { second = best; sp = bp; best = d; bp = p.paint; } else if (d < second) { second = d; sp = p.paint; }
    }
    let name = bp, edge = 1;
    const take = (s) => { if (Math.abs(s) < Math.abs(edge)) edge = s; };
    let body = null;
    for (const c of this.cuts) {
      if (!c.paint) continue;
      const dc = c.prim.d(x, y, z);
      if (dc > 0.05 + c.k) continue;
      body ??= this.bodyDist(x, y, z);
      const s = Math.max(dc, 0) + Math.min(body, 0);                      // + on the face, - inside the carve
      if (s < 0) name = c.paint;
      take(s);                                                            // lip line on the rim
    }
    for (const r of this.regions) {
      const d = r.prim.d(x, y, z), under = name;
      if (d < 0) name = r.name;
      if (r.name !== under) take(d);                                      // a line only where the paint changes
    }
    // seam between two blended shapes of different paint, unless a region or cut repainted the spot
    if (bp !== sp && name === bp) take((bp < sp ? 1 : -1) * (second - best));
    return { name, edge: Math.max(-1, Math.min(1, edge)) };
  }

  bounds() {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const p of this.parts) for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], p.prim.min[i] - p.k); max[i] = Math.max(max[i], p.prim.max[i] + p.k);
    }
    return { min, max };
  }

  // Surface nets. cell = grid step in metres. colors: { paintName: '#hex' }.
  mesh({ cell = 0.015, colors = {} } = {}) {
    const { min, max } = this.bounds();
    const o = min.map((v) => v - cell * 2);
    const n = max.map((v, i) => Math.ceil((v + cell * 2 - o[i]) / cell) + 1);
    const [nx, ny, nz] = n, sxy = nx * ny;
    const F = new Float32Array(nx * ny * nz);
    // Narrow band: a coarse pass every C cells, then exact samples only near the surface (10-20x fewer evaluations).
    // Far points keep the coarse value: right sign, and never part of a cell the surface crosses.
    const C = 4, cx = Math.ceil((nx - 1) / C) + 1, cy = Math.ceil((ny - 1) / C) + 1, cz = Math.ceil((nz - 1) / C) + 1;
    const FC = new Float32Array(cx * cy * cz);
    for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++)
      FC[i + j * cx + k * cx * cy] = this.dist(o[0] + i * C * cell, o[1] + j * C * cell, o[2] + k * C * cell);
    const band = (C * 0.5 * Math.sqrt(3) + 2) * cell * 1.5;   // 1.5: ellipsoid and blend distances are not exact
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const v = FC[Math.round(i / C) + Math.round(j / C) * cx + Math.round(k / C) * cx * cy];
      F[i + j * nx + k * sxy] = Math.abs(v) > band ? v : this.dist(o[0] + i * cell, o[1] + j * cell, o[2] + k * cell);
    }

    const cellIdx = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
    const cid = (i, j, k) => i + j * (nx - 1) + k * (nx - 1) * (ny - 1);
    const pos = [];
    const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const corner = (c) => [c & 1, (c >> 1) & 1, (c >> 2) & 1];
    const v = new Float32Array(8);
    for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let mask = 0;
      for (let c = 0; c < 8; c++) {
        const [a, b, e] = corner(c);
        v[c] = F[i + a + (j + b) * nx + (k + e) * sxy];
        if (v[c] < 0) mask |= 1 << c;
      }
      if (mask === 0 || mask === 255) continue;
      let x = 0, y = 0, z = 0, cnt = 0;
      for (const [c0, c1] of E) {
        if ((v[c0] < 0) === (v[c1] < 0)) continue;
        const t = v[c0] / (v[c0] - v[c1]), A = corner(c0), B = corner(c1);
        x += A[0] + (B[0] - A[0]) * t; y += A[1] + (B[1] - A[1]) * t; z += A[2] + (B[2] - A[2]) * t; cnt++;
      }
      cellIdx[cid(i, j, k)] = pos.length / 3;
      pos.push(o[0] + (i + x / cnt) * cell, o[1] + (j + y / cnt) * cell, o[2] + (k + z / cnt) * cell);
    }

    const idx = [];
    const quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; flip ? idx.push(a, c, b, a, d, c) : idx.push(a, b, c, a, c, d); };
    for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const f0 = F[i + j * nx + k * sxy] < 0;
      if (i < nx - 1 && f0 !== (F[i + 1 + j * nx + k * sxy] < 0))       // x edge: cells around it in y,z
        quad(cellIdx[cid(i, j - 1, k - 1)], cellIdx[cid(i, j, k - 1)], cellIdx[cid(i, j, k)], cellIdx[cid(i, j - 1, k)], !f0);
      if (j < ny - 1 && f0 !== (F[i + (j + 1) * nx + k * sxy] < 0))     // y edge
        quad(cellIdx[cid(i - 1, j, k - 1)], cellIdx[cid(i - 1, j, k)], cellIdx[cid(i, j, k)], cellIdx[cid(i, j, k - 1)], !f0);
      if (k < nz - 1 && f0 !== (F[i + j * nx + (k + 1) * sxy] < 0))     // z edge
        quad(cellIdx[cid(i - 1, j - 1, k)], cellIdx[cid(i, j - 1, k)], cellIdx[cid(i, j, k)], cellIdx[cid(i - 1, j, k)], !f0);
    }

    // normals from the field gradient (or a smooth shading shape), paint and edge distance per vertex
    const N = pos.length / 3, nor = new Float32Array(N * 3), col = new Float32Array(N * 3), edgeA = new Float32Array(N);
    const h = cell * 0.5, cache = {};
    const lin = (hex) => cache[hex] ??= new THREE.Color(hex);   // already linear (three's colour management)
    const grad = (fn, x, y, z) => {
      const gx = fn(x + h, y, z) - fn(x - h, y, z), gy = fn(x, y + h, z) - fn(x, y - h, z), gz = fn(x, y, z + h) - fn(x, y, z - h);
      const l = len3(gx, gy, gz) || 1; return [gx / l, gy / l, gz / l];
    };
    const D = (x, y, z) => this.dist(x, y, z);
    for (let q = 0; q < N; q++) {
      const x = pos[q * 3], y = pos[q * 3 + 1], z = pos[q * 3 + 2];
      let g = grad(D, x, y, z);
      for (const s of this.shades) {
        const w = Math.min(1, Math.max(0, -s.mask.d(x, y, z) / s.soft));
        if (w <= 0) continue;
        const gs = grad(s.shape.d, x, y, z);
        g = g.map((c, i) => c * (1 - w) + gs[i] * w);
        const l = len3(...g) || 1; g = g.map((c) => c / l);
      }
      nor.set(g, q * 3);
      const p = this.paintAt(x, y, z);
      const c = lin(colors[p.name] ?? colors.base ?? '#cccccc');
      col[q * 3] = c.r; col[q * 3 + 1] = c.g; col[q * 3 + 2] = c.b;
      edgeA[q] = p.edge;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('edge', new THREE.BufferAttribute(edgeA, 1));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    return geo;
  }
}

// Pose -> geometry with a cache. build(pose) returns a Sculpt. Pose values are rounded to `quant` for the key,
// so poses that repeat (holds, cycles, blinks) mesh once.
export class SdfCharacter {
  constructor(build, { colors, quant = 1e-3, max = 400 } = {}) {
    this.build = build; this.colors = colors; this.quant = quant; this.max = max; this.cache = new Map();
    this.stats = { built: 0, hits: 0, ms: 0 };
  }
  key(pose, cell) {
    const r = (v) => (typeof v === 'number' ? Math.round(v / this.quant) : Array.isArray(v) ? v.map(r) : v);
    return JSON.stringify(Object.entries(pose).sort().map(([k, v]) => [k, r(v)])) + '@' + cell;
  }
  geometry(pose, { cell = 0.015 } = {}) {
    const k = this.key(pose, cell);
    let g = this.cache.get(k);
    if (g) { this.stats.hits++; this.cache.delete(k); this.cache.set(k, g); return g; }
    const t0 = performance.now();
    g = this.build(pose).mesh({ cell, colors: this.colors });
    this.stats.built++; this.stats.ms += performance.now() - t0;
    this.cache.set(k, g);
    if (this.cache.size > this.max) { const [old, og] = this.cache.entries().next().value; this.cache.delete(old); og.dispose(); }
    return g;
  }
}

// Mesh detail for how big the character is on screen: about one grid cell per `px` pixels, never coarser than
// `base` (wides) nor finer than `fine` (extreme close-ups). Close-ups (> 650 px tall) get a finer mesh automatically.
// Snapped to a few fixed levels so a moving camera does not re-mesh (and shimmer) on every frame.
export function cellFor(screenPx, height, { base = 0.012, fine = 0.004, px = 5 } = {}) {
  const c = Math.max(fine, Math.min(base, (height / Math.max(1, screenPx)) * px));
  return +(base * 0.75 ** Math.round(Math.log(c / base) / Math.log(0.75))).toFixed(5);
}
