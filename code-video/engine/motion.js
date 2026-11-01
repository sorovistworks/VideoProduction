// Motion primitives. Everything is a pure function of time, so any frame renders on its own.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, p) => a + (b - a) * p;
// 0..1 progress of t through [start, start + dur]
export const prog = (t, start, dur) => clamp((t - start) / dur);

// Damped spring from 0 to 1. Stiff k = snappy (buttons), soft k = heavy (big type, logos).
export function spring(t, k = 170, d = 26) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k), z = d / (2 * w0);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

// keys: [[time, value], ...]. One spring per change, stacked, so retargeting stays smooth.
export function track(t, keys, k = 170, d = 26) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * spring(t - keys[i][0], k, d);
  return v;
}

// Seeded PRNG (mulberry32). Use rng(frameIndex) for per-frame grain, rng(id) for stable layouts.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// Whole frames for a duration, rounded UP. The epsilon stops 7.2 * 30 = 216.00000000000003 becoming 217.
export const frames = (sec, fps) => Math.ceil(sec * fps - 1e-6);
