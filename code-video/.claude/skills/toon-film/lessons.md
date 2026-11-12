# What breaks (and the fix)

From the Load-Bearing production (Higgsfield's write-up) and from building this kit. Read before a full render.

## Rendering
- **Ghost on every cut:** motion-blur sub-renders on a shot's first frame reached back into the previous shot.
  Fixed in `film.js`: every sample is clamped to its own shot. Keep it that way when you touch the shutter code.
- **A shader that fails still gives a plausible frame** (all the grass vanished: a fragment-only function was loaded
  into a vertex shader). `film.js` sets `window.__fatal` on any compile error and `render-film.mjs` stops at once.
  Never swallow a shader error to "get the render out".
- **Washed-out picture on NVIDIA** until shaders declared high precision: the film renderer asks for `highp`, and
  custom shaders must declare `precision highp float; precision highp int;`.
- **A sky flipped amber to navy in one frame:** a light angle wrapped past 180°. Mix light directions as vectors
  (`mixPalette` does) or measure angles from the shot's first frame; never lerp raw angles across ±180°.
- **A failed frame left an old image on disk that slipped into the edit.** `render-film.mjs` writes chunks to a temp
  name and renames only after the frame count is verified; failed frames are never written.
- **Joining chunk files dropped one-frame segments.** Assembly decodes every chunk into one encode and checks the
  frame count at every step. Do not "optimise" it into a stream-copy concat.
- **A long render on a laptop ran out of memory and crashed the machine.** Big finals go to a GPU server or run in
  chunks with `--chunks` across sessions. A shared GPU can run 5–10× slower: check it is idle before launching.
- **Colours twice-linearised:** `new THREE.Color('#hex')` is already linear in three r152+. Never call
  `convertSRGBToLinear()` on it (it turned a soft grey character near-black purple).
- **Two-sided cards dark on the back** (grass, leaves): three flips the normal on back faces. `paintedMaterial({ side:
  THREE.DoubleSide })` lights both faces like the front.

## Animation
- First review round of Load-Bearing: 111 defects, 38 visible at normal speed: hands through props, floating feet,
  one-frame pops. Look for an engine fix that clears a whole class before fixing shots one by one.
- Poses are functions of WORLD time and the cut list maps film time to world time: freezes, rewinds and replays reuse
  the same animation. Never key a pose on film time.
- Mesh the SDF body once per frame (pose at the frame time, cached); move roots, eyes, lids and props per sub-render.
- Ink lines on paint boundaries come from a signed distance attribute and `fwidth`; a line appears only where the
  paint actually changes (regions repainting both sides of a seam remove the seam's line).

## Taste
- The blind critic's honest scores pointed at the real gap (character rendering 4.5 vs the reference's 7.0, world
  7.5 vs 7.0): spend the next rounds on faces, clean outlines and acting, not on more scenery.
- Start small: a 25–30 s cold open, reviewed frame by frame and shown to a reviewer who has not read the script,
  before going long.
