// ANIMATOR (scene: cold open) owns this file. Poses are functions of WORLD time, so the freeze and the rewind
// in the cut list reuse them unchanged. Anticipation -> action -> follow-through; holds that still breathe.
import { spring, track, clamp, lerp } from '/engine/motion.js';
import { GUST_AT, NIB_AT } from '../sets/meadow.js';

const INHALE = 1.55;                         // starts drawing breath

// blink helper: quick close, slower open
const blinkAt = (w, at) => { const u = w - at; return u < 0 || u > 0.22 ? 0 : u < 0.07 ? u / 0.07 : 1 - (u - 0.07) / 0.15; };

export function nibPose(w) {
  const breath = Math.sin(w * 2.4) * 0.5 + 0.5;
  // inhale: puff builds with a spring, overshoots a little; released on the sneeze
  const puffIn = track(w, [[0, 0], [INHALE, 0.95]], 22, 7);
  const release = w >= GUST_AT ? spring(w - GUST_AT, 160, 14) : 0;
  const puff = clamp(puffIn * (1 - release) + 0.03 * breath, 0, 1.1);
  // arms rise with the breath, fling back on the blast
  const raise = track(w, [[0, 0.32], [INHALE + 0.2, 1.15], [GUST_AT, 0.55]], 60, 11);
  const fwd = track(w, [[0, 0.15], [INHALE + 0.2, -0.25], [GUST_AT, 0.95]], 70, 12);
  // lean back while inhaling (anticipation), snap forward on the sneeze (action), settle (follow-through)
  const lean = track(w, [[0, 0], [INHALE + 0.3, -0.22], [GUST_AT - 0.05, -0.3], [GUST_AT, 0.32], [GUST_AT + 0.6, 0.06]], 90, 13);
  const squash = w >= GUST_AT ? 0.9 * (1 - spring(w - GUST_AT, 300, 10)) : 0;
  // mouth: tight while holding breath, huge on the sneeze
  const open = w < GUST_AT - 0.35 ? 0.04 * breath
    : w < GUST_AT ? 0 : clamp(1 - (w - GUST_AT) / 0.55) * 1.0;
  const wide = w < GUST_AT ? -0.6 : 0.5;
  const blink = Math.max(blinkAt(w, 0.9), blinkAt(w, 5.2), w > GUST_AT - 0.12 && w < GUST_AT + 0.42 ? 1 : 0);
  const gazeX = track(w, [[0, 0.35], [1.2, -0.05]], 120, 18);       // glances at the lantern, then the lens
  const hop = w >= GUST_AT ? Math.max(0, Math.sin(clamp((w - GUST_AT) / 0.38) * Math.PI)) * 0.12 : 0;
  const recoil = w >= GUST_AT ? spring(w - GUST_AT, 120, 16) : 0;    // the sneeze pushes Nib back a step
  return {
    mesh: { puff, raiseL: raise, raiseR: raise * 0.92, fwdL: fwd, fwdR: fwd, open, wide, squash },
    live: { blink, gazeX, gazeY: -0.05, lean },
    root: { x: NIB_AT[0] + 0.06 * recoil, z: NIB_AT[1] - 0.24 * recoil, lift: hop, yaw: lerp(-0.25, -0.18, recoil) },
  };
}
