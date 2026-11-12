// DIRECTOR OF PHOTOGRAPHY owns this file: every camera, lens and cut. Animators never move the camera.
// Units: metres, focal length mm (36 mm gate), f-stops. samples: ~8 for still shots, up to 64 for fast moves.
// world: film time -> world time. A freeze is a constant; a rewind runs world time backwards.
import { CutList } from '/engine/toon/cutlist.js';

const F = (n) => n / 24;                              // cuts sit on whole frames (24 fps)
const NIB_FACE = [0.42, 0.68, 0.4];
export const FREEZE = F(104);                         // record scratch: the world stops here (4.333 s)
const REWIND = F(200), CALM = F(240), END = F(276);   // 8.333 s, 10 s, 11.5 s
const SPEED = 2.0;                                    // rewind runs the world backwards at 2x

// the hand-off frame between s02 and s03 is one shared camera state (a seam is a contract)
const SEAM = { pos: [1.95, 0.55, 3.45], target: [0.3, 0.64, 0.45], focal: 32, fstop: 2.8 };

export const cut = new CutList([
  { id: 's01', start: 0, end: F(72), samples: 8, note: 'wide: the meadow at dusk, slow push',
    keys: [
      { t: 0, pos: [5.6, 1.65, 7.6], target: [-0.6, 0.95, -0.6], focal: 24, fstop: 5.6 },
      { t: F(72), pos: [4.6, 1.4, 6.1], target: [-0.3, 0.9, -0.3], focal: 24, fstop: 5.6 },
    ] },
  { id: 's02', start: F(72), end: FREEZE, samples: 16, note: 'low medium: the big inhale and the sneeze-gust',
    keys: [
      { t: F(72), pos: [1.7, 0.5, 3.0], target: [0.33, 0.64, 0.55], focal: 32, fstop: 2.8 },
      { t: FREEZE, ...SEAM },
    ] },
  { id: 's03', start: FREEZE, end: REWIND, samples: 24, world: () => FREEZE,
    note: 'time-freeze: hold the wide beat, then fly ~5 m through the frozen leaves into Nib\'s face',
    keys: [
      { t: FREEZE, ...SEAM },
      { t: 5.0, pos: [1.92, 0.56, 3.4], target: [0.3, 0.65, 0.45], focal: 32, fstop: 2.8, hold: true },
      { t: 6.6, pos: [1.3, 0.7, 2.6], target: [0.38, 0.7, 0.45], focal: 36, fstop: 2.2 },
      { t: 7.5, pos: [0.98, 0.78, 2.35], target: NIB_FACE, focal: 40, fstop: 2.0, hold: true },
      { t: REWIND, pos: [0.95, 0.78, 2.27], target: NIB_FACE, focal: 40, fstop: 2.0 },
    ] },
  { id: 's04', start: REWIND, end: CALM, samples: 16, world: (t) => FREEZE - (t - REWIND) * SPEED,
    note: 'rewind: the world runs backwards (leaves fly home), camera sweeps the other way',
    keys: [
      { t: REWIND, pos: [-3.2, 2.1, 5.2], target: [0.0, 0.8, 0.2], focal: 28, fstop: 4 },
      { t: CALM, pos: [2.2, 1.7, 6.6], target: [0.0, 0.8, 0.2], focal: 28, fstop: 4 },
    ] },
  { id: 's05', start: CALM, end: END, samples: 8, world: (t) => FREEZE - (CALM - REWIND) * SPEED + (t - CALM), note: 'calm again: "Okay. Let\'s back up."',
    keys: [
      { t: CALM, pos: [2.3, 1.05, 3.4], target: [0.35, 0.75, 0.55], focal: 40, fstop: 4 },
      { t: END, pos: [2.0, 1.0, 3.0], target: [0.35, 0.75, 0.55], focal: 40, fstop: 4 },
    ] },
], { fps: 24 });

export const DURATION = cut.duration;
