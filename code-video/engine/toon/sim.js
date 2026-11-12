// Effects with history (a straw blizzard, debris, a leaf storm) as a pure function of time:
// simulated from the start with a fixed step, checkpointed, so frame 4000 renders without frame 3999. Owned by set & FX.
//
//   const storm = cachedSim({
//     dt: 1 / 240,
//     init: () => ({ p: new Float32Array(N * 3), v: new Float32Array(N * 3), seed: 7 }),
//     step: (s, dt, t) => { ... },          // mutate s; use only s and t (and rng seeded from s.seed)
//   });
//   const s = storm.at(worldT);             // read-only snapshot; never mutate it
//
// Rules: no Math.random, no Date, nothing outside `s` and `t`. Time-freeze = call at() with the frozen world time.
export function cachedSim({ dt = 1 / 240, init, step, every = 0.5, start = 0 }) {
  const ckpt = new Map();                                  // step index -> snapshot
  const per = Math.max(1, Math.round(every / dt));
  let work = null, workStep = -1;
  const clone = (s) => structuredClone(s);
  return {
    at(t) {
      const target = Math.max(0, Math.floor((t - start) / dt + 1e-6));
      if (!(workStep >= 0 && workStep <= target && target - workStep < per * 2)) {
        let k = Math.floor(target / per) * per;
        while (k > 0 && !ckpt.has(k)) k -= per;
        if (k === 0 && !ckpt.has(0)) ckpt.set(0, init());
        work = clone(ckpt.get(k)); workStep = k;
      }
      while (workStep < target) {
        step(work, dt, start + workStep * dt);
        workStep++;
        if (workStep % per === 0 && !ckpt.has(workStep)) ckpt.set(workStep, clone(work));
      }
      return work;
    },
  };
}
