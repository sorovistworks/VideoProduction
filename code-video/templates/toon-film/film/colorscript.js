// LIGHTING owns this file: the colour script (one palette per sequence) and the grade.
// One motivated key light per shot (the low sun), flat coloured shadows (ambient), glow only on real lights.
// Write the matching notes in docs/colorscript.md (sequence -> palette -> why).
import { paletteAt } from '/engine/toon/shade.js';
import { FREEZE } from './cutlist.js';

export const PALETTES = {
  // violet evening, one amber window
  evening: {
    skyTop: '#3a2d6c', skyHorizon: '#f39a63', skyBelow: '#7a4f6a',
    sun: { color: '#ffb877', intensity: 3.4, dir: [0.45, 0.32, 0.84], size: 0.0025 },
    ambientSky: '#7d6cd0', ambientGround: '#5a3a52', ambient: 1.55,
    fog: '#c88a8a', fogDensity: 0.016,
    cloudLit: '#ffc59a', cloudShade: '#7d61aa', cloudCover: 0.44, drift: 0,
    grade: { exposure: 1.0, lift: [0.02, 0.0, 0.035], gamma: [1, 1, 1], gain: [1.03, 0.98, 0.95], saturation: 1.1, contrast: 1.04, vignette: 0.32, grain: 0.014 },
  },
  // the time-freeze: cooler, desaturated, the world holds its breath
  freeze: {
    skyTop: '#2b3654', skyHorizon: '#a6b9cc', skyBelow: '#59627a',
    sun: { color: '#e4ecff', intensity: 2.6, dir: [0.45, 0.32, 0.84], size: 0.0025 },
    ambientSky: '#8a9bc4', ambientGround: '#454b5e', ambient: 1.45,
    fog: '#9eabbd', fogDensity: 0.02,
    cloudLit: '#dbe5f2', cloudShade: '#6e7d9a', cloudCover: 0.44, drift: 0,
    grade: { exposure: 1.0, lift: [0.0, 0.01, 0.03], gamma: [1, 1, 1.02], gain: [0.95, 1.0, 1.06], saturation: 0.55, contrast: 1.1, vignette: 0.42, grain: 0.018 },
  },
};

// film time -> palette (crossfades in `blend` seconds)
export const SCRIPT = [
  { at: 0, palette: PALETTES.evening },
  { at: FREEZE, palette: PALETTES.freeze, blend: 0.25 },      // snaps cool on the record scratch
  { at: 200 / 24, palette: PALETTES.evening, blend: 0.6 },      // warms back up through the rewind
];

export const paletteFor = (t) => paletteAt(SCRIPT, t);
