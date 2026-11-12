// Cut list: every camera in the film, as keyframed shots. Owned by the director of photography.
//
// A shot:
//   { id: 's03', start: 6.2, end: 9.0,           film seconds, [start, end)
//     samples: 16, shutter: 180,                 sub-renders per frame, shutter angle in degrees (45 = crisp beat)
//     world: (t) => t,                           film time -> world time (freeze: () => 7.4, rewind: (t) => 30 - t)
//     keys: [ { t: 6.2, pos: [x,y,z], target: [x,y,z], focal: 35, fstop: 4, focus: 'target' | metres, hold: false,
//               roll: 0 (degrees) }, ... ] }
//
// Keys are Hermite curves with time-aware tangents, so speed is continuous across keys of uneven spacing.
// Ends extrapolate along their tangent (the "handles" before and after a shot): frame 0 of a shot is already moving.
// `hold: true` on a key gives it zero velocity (ease into / out of it).
// Lens: focal length in mm on a 36 mm-wide gate (the long side of the frame), aperture as an f-stop, focus in metres.

const V = (a) => a.slice();
const sub = (a, b) => a.map((x, i) => x - b[i]);
const add = (a, b) => a.map((x, i) => x + b[i]);
const mul = (a, s) => a.map((x) => x * s);

function hermite(keys, t, get) {
  const n = keys.length;
  const val = (i) => { const v = get(keys[i]); return Array.isArray(v) ? v : [v]; };
  const tan = (i) => {
    if (keys[i].hold || n === 1) return val(i).map(() => 0);
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
    return mul(sub(val(b), val(a)), 1 / (keys[b].t - keys[a].t));
  };
  if (n === 1) return val(0);
  if (t <= keys[0].t) return add(val(0), mul(tan(0), t - keys[0].t));           // pre-roll handle
  if (t >= keys[n - 1].t) return add(val(n - 1), mul(tan(n - 1), t - keys[n - 1].t)); // post-roll handle
  let i = 0;
  while (t > keys[i + 1].t) i++;
  const h = keys[i + 1].t - keys[i].t, u = (t - keys[i].t) / h, u2 = u * u, u3 = u2 * u;
  const p0 = val(i), p1 = val(i + 1), m0 = tan(i), m1 = tan(i + 1);
  return p0.map((_, k) => (2 * u3 - 3 * u2 + 1) * p0[k] + (u3 - 2 * u2 + u) * h * m0[k] +
    (-2 * u3 + 3 * u2) * p1[k] + (u3 - u2) * h * m1[k]);
}

export class CutList {
  constructor(shots, { fps = 24 } = {}) {
    this.fps = fps;
    this.shots = shots.map((s) => ({ samples: 12, shutter: 180, world: (t) => t, ...s }))
      .sort((a, b) => a.start - b.start);
    for (const s of this.shots) {
      if (!s.keys?.length) throw new Error(`shot ${s.id}: no camera keys`);
      s.keys.sort((a, b) => a.t - b.t);
    }
    this.duration = Math.max(...this.shots.map((s) => s.end));
  }

  // The shot that owns film time t. Times past the end stay in the last shot.
  shotAt(t) {
    for (const s of this.shots) if (t >= s.start && t < s.end) return s;
    return t < this.shots[0].start ? this.shots[0] : this.shots[this.shots.length - 1];
  }

  // Camera state of `shot` at film time t (t may sit outside the shot: handles extrapolate).
  camera(shot, t) {
    const k = shot.keys;
    const pos = hermite(k, t, (x) => x.pos);
    const target = hermite(k, t, (x) => x.target);
    const focal = hermite(k, t, (x) => x.focal ?? 35)[0];
    const fstop = hermite(k, t, (x) => x.fstop ?? 8)[0];
    const roll = hermite(k, t, (x) => x.roll ?? 0)[0];
    const dist = Math.hypot(...sub(target, pos));
    const focus = hermite(k, t, (x) => (x.focus === undefined || x.focus === 'target' ? NaN : x.focus))[0];
    return { pos: V(pos), target: V(target), focal, fstop, roll, focus: Number.isFinite(focus) ? focus : dist };
  }

  // Cuts for the review tools (window.CUTS -> docs/cutlist.json).
  cuts() {
    return this.shots.map((s) => ({ id: s.id, start: s.start, end: s.end, frame: Math.round(s.start * this.fps),
      samples: s.samples, shutter: s.shutter, note: s.note ?? '' }));
  }
}

// Vertical field of view (degrees) for a focal length on a 36 mm gate laid on the frame's long side.
export function fovFor(focal, w, h) {
  const half = 18 / focal;                         // tan of half the long-side angle
  const tanV = w >= h ? half * (h / w) : half;
  return (2 * Math.atan(tanV) * 180) / Math.PI;
}
