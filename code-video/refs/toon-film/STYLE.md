# toon-film: house style

Studied from `load-bearing_higgsfield.mp4` (Higgsfield's "Load-Bearing", 2:56, 1920×1080, 24 fps: a 3-minute
cartoon drawn entirely by code with three.js), frame by frame: contact sheets every 2 s in `contact/`, cuts
detected with ffmpeg, the dialogue transcribed with `tools/words.py`, loudness measured with ebur128.
**Take the grammar, never the content.** Their characters (the pigs Pip, Hank and Bree, Vince the wolf), names,
title design, gags and the "HIGGSFIELD / FABLE 5.2" badge are theirs. Our films get our own cast, look and angle.
The media in this folder is local only (git ignores it).

## Shape of the film
- **Cold open on the climax** (0–9 s): the big moment, then a freeze (record scratch) and a fly-in to a reaction
  face, then a narrator line ("let's back up") and a rewind. The title lands around 0:15.
- Then the story in order: meet each character (one gag each, with a prop that carries a joke in text), the
  antagonist's intro (darker set, low angles), three escalating attempts, payoff, moral, one button gag at the end.
- **Shots:** 74 in 176 s, average 2.4 s, from ~0.5 s reaction inserts to ~10 s establishing moves. A new idea
  every 2–4 s. Holds only on a gag landing.
- **Dialogue is sparse:** 186 words in 176 s. A dry, close narrator plus short character lines; the action and
  the score carry most of the film. Lines are short (1–7 words) with air around them.

## Look
- **World painted, characters clean.** World: one motivated key light per shot, brush texture only where light
  falls, flat *coloured* shadows (violet at dusk, blue at night), painted skies with stylised cumulus (lit rims),
  haze layers in depth. Characters: two tones with a soft terminator, an ink outline, ink lines where materials meet.
- **Glow only on real light sources:** windows, lanterns, the sun, fire. Never on characters or props.
- **Colour script** (one palette per sequence): violet evening with one amber window → cool, desaturated freeze →
  a sweep through noon in the rewind → bright green-gold day for the intros → blue night with warm windows for
  the siege → cyan morning with golden straw for the ending.
- **Materials read at a glance:** straw is bundled strands with hard light streaks, sticks are sticks, bricks are
  bricks with mortar lines, wood has grain strokes. Props carry readable text (signs, clipboards, name tags).
- **Title is built, not typed:** letters assembled from the story's materials on a musical downbeat.

## Camera
- Lenses: wides 24–28 mm from low-ish height (1–1.6 m); character mediums 32–40 mm; close-ups 32–50 mm at
  f/2–f/2.8 with real depth of field; inserts (clipboard, laser level, buttons) close and shallow.
- Moves: slow push-ins on reactions, low angles for the antagonist, high angles for helplessness, a fly-through
  of frozen debris, POV through a slot/window as a framing gag, whip-pans into chase action. The camera never
  sits dead still; even holds drift.
- Real motion blur on fast action (frames show smeared limbs and debris), crisp short shutter on poses meant to
  read (a "rocket pose").

## Characters
- One base shape each (round / square / triangle / lanky), readable in silhouette, at clearly different scales.
- One accessory each that says who they are (hat, cap, glasses + tool belt, vest with straining buttons + name tag).
- Big eyes with real lids (blinks, squints, half-lidded sleepiness), carved mouths driven by the voice, chunky
  hands, feet planted on the ground. Squash and stretch on hits, anticipation before every big action.

## Sound
- Score and effects synthesized: a heartbeat pre-roll already running at frame 0, a record scratch made from the
  music itself, a fast chase cue (~184 BPM) starting exactly on the blast, a bouncy folk-pop main theme (~118 BPM)
  with a beat that lands on a gag. Hits on the frame.
- Measured: integrated −14.8 LUFS, loudness range 6.8 LU. Target −14 LUFS / −1 dBTP.

## Avoid
- Copying their cast, names, gags, title or shot list. A public-domain tale is free; its famous screen versions
  are not, and neither is this film.
- Glow on non-light objects, outlines on the world (only characters get ink), photoreal textures, grey shadows,
  dead-still cameras, long dialogue scenes.
