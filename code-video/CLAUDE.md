# Category 2: code-rendered video

Every video here is rendered from code. A model writes the scene; this machine draws every frame; ffmpeg encodes. No per-render fees, no AI video generation unless a shot truly needs a real face (then see Routes).

**Run every command from `code-video/`** (this folder is its own npm + uv project). Start a new video with the `code-video` skill (`.claude/skills/code-video/SKILL.md`); a captions reel on the user's own clip with the `captions-reel` skill; a cartoon short film (3D characters, painted world, a real camera) with the `toon-film` skill.

## Layout
- `engine/` shared renderer, preview server, motion library. Do not copy these into projects.
- `engine/toon/` the cartoon kit (cut list, sub-sample film renderer, SDF characters, painted toon shading, cached sims, lip sync, props) and `engine/render-film.mjs` (chunked, verified production render). See the `toon-film` skill.
- `tools/` beats, word timings, captions, sound library, mastering, review sheets, motion audit, script diff.
- `templates/starter/` 2D canvas seed; `templates/starter-3d/` three.js seed (shadows, true brand colour, DOM type over WebGL); `templates/toon-film/` a working cartoon cold open split by department (cast, sets, scenes, cut list, colour script, score). `templates/briefs.md` prompt templates.
- `projects/<name>/` one folder per video: `index.html`, `assets/`, `audio/score.py`, `docs/`, `out/`.
- `refs/<genre>/` the user's reference clips and images, one folder per genre, each with a reusable `STYLE.md` (see `refs/README.md`). Take the grammar, never the content. `fonts/` shared fonts, loaded as `url("/fonts/<file>.woff2")`.

## Setup (once)
`npm install` · `uv sync` · ffmpeg on PATH. Rendering uses installed Chrome, else `npx playwright install chromium`.

## Render contract
- A film is a pure function of time: `window.seek(t)` paints the frame at `t` seconds. It may be async.
- The page sets `window.DURATION` (seconds). Optional `window.ready` promise for asset loading.
- No CSS transitions, no setTimeout, no requestAnimationFrame, no Date.now, no state carried between frames in render mode (`?render` in the URL). Preview mode may loop with rAF.
- Seeded randomness only: `rng(seed)` from `/engine/motion.js`. Never `Math.random`.
- Layout reads the viewport size, so 16:9 and 9:16 come from the same page with their own framing (never a crop).
- Import shared code by absolute path: `import { spring, track, rng } from '/engine/motion.js'` (the server's root is `code-video/`).

## Commands (run from `code-video/`)
- Preview live: `npm run preview` → open the printed URL + `projects/<name>/`.
- Stills for approval: `node engine/render.mjs projects/<name> --stills 0.5,2,4.2`
- Draft video: `node engine/render.mjs projects/<name> --draft`
- Final 16:9: `node engine/render.mjs projects/<name>` (60 fps, 4 blended subframes = real motion blur)
- Final 9:16: `node engine/render.mjs projects/<name> --w 1080 --h 1920`
- Review sheets: `node tools/review.mjs projects/<name>/out/final_1920x1080.mp4 [--at 4.2]` → read the PNGs it lists (contact, phone, strip, wave: 300 px = 1 s).
- Motion audit: `uv run tools/motion_audit.py projects/<name>/out/draft_1920x1080.mp4` (static stretches, one-frame pops, flashes).
- Beats: `uv run tools/beats.py audio/track.wav -o docs/beats.json`
- Word timings: `uv run tools/words.py audio/voice.mp3 -o docs/timing.json` (small.en is downloaded; reads video files too; starts snapped to the waveform; prints `index:word`, doubtful words marked `(?)`)
- Footage prep: `uv run tools/footage.py clip.mp4 projects/<name> [--from <s> | --no-cutout] [--clean]` → colour-correct frames, the clip's voice, soft-edged cut-out (rembg birefnet-portrait, model in `.models/`), head line → `docs/footage.json`
- Storyboard: `node engine/render.mjs projects/<name> --stills board` renders one still per entry of the page's `window.STORYBOARD`
- Script check: `uv run tools/scriptdiff.py audio/narration.txt docs/timing.json` (dropped/changed words in the take)
- Captions: `uv run tools/srt.py docs/timing.json -o out/captions.srt`
- Thumbnail: a `thumb.html` page in the project (same seek contract, static at t=0) → `node engine/render.mjs projects/<name> --page thumb.html --w 1280 --h 720 --stills 0`
- Always write data files with `-o`, never `>`: PowerShell redirects re-encode and corrupt them.
- Sound: write `projects/<name>/audio/score.py` with `tools/sound.py` (see its docstring for a full example) → `uv run projects/<name>/audio/score.py` writes `audio/mix.wav`. Self-check: `uv run tools/sound.py`.
- Mux + master every rendered format: `node tools/finish.mjs projects/<name>` → `out/final_*.mp4` at −14 LUFS / −1 dBTP, measured and printed (exits 1 if off target).
- ffmpeg gotcha: `-framerate` goes BEFORE `-i`, or it assumes 25 fps.
- Render speed (measured): 5 s draft ≈ 8 s; 5 s final (60 fps × 4 subframes) ≈ 80 s, per format. 3D draft ≈ 9 s.
- Toon films (24 fps, sub-renders inside the page): `node engine/render-film.mjs projects/<name> [--draft | --samples N] [--workers 2] [--from s --to s --redo] [--chunks a-b] [--assemble] [--meta]` → `out/draft_*.mp4` / `out/silent_*.mp4`, every frame checked, chunks lossless, frame counts verified. Measured on this laptop (AMD Radeon iGPU, 2 workers): the 11.5 s template sample takes ≈ 3.7 min final (8–24 sub-renders/frame), ≈ 1.5 frames/s draft; SDF character meshing is 0.35–1.4 s per new pose. Stills take page flags: `--query "samples=1"`, `--query silhouette`, `--query debug=normals|albedo`.
- Animation review: `uv run tools/anim_review.py <film.mp4> [--shots s03,s04] [--at 6.2 --crop x,y,w,h]` → 12 fps sheets with frame numbers per shot, first frames after every cut, contact close-ups, `pops.txt`.
- Lip sync: `uv run tools/lipsync.py projects/<name>/docs/voices.json -o projects/<name>/docs/lipsync.json` · voice takes: `uv run tools/takes.py "<line>" <takes…>` · cue check: `uv run tools/cues.py <sfx.wav> <docs/cues.json>`.

## Look
- Banned: centered title on a gradient, everything fading in, corner labels and frame borders, glow on UI or logos, generic particle bursts, strobe montages, flare to white, RGB-split glitch, ring pulses, dolly zoom, karaoke captions on every word.
- One display font, one UI font, one accent colour unless the brief says otherwise. Colour only on the heroes.
- Hook readable and moving within 0.3 s: one big readable slam on the first beat, not a montage.
- Something new every 2 to 4 s. One "wow" per scene, resolving into a crisp frame held ≥ 0.4 s. Camera never static.
- Springs, not easing curves: `spring()` / `track()`. Tiny overshoot on UI, none on type. A value with several targets uses `track()`.
- Text renders at full size; never scale small text up.
- Seams are contracts: when one scene hands an element to the next, both draw the same thing on the same frame.

## Voice and timing (voice first, always)
- Record the voice before animating. ElevenLabs: whole script in ONE call, mood tags in brackets, 2+ takes, keep the best take uncut and unstretched.
- Voice via the ElevenLabs connector in Claude, or `ELEVENLABS_API_KEY` in `code-video/.env` (copy `.env.example`). Never paste a key into a prompt.
- Measure word onsets into ONE timing file (`docs/timing.json`) that picture, type and sound all read.
- Re-time the picture to the voice, never the voice to the picture. Too long? Cut words, never speed up.
- Scene durations round UP to whole frames: `Math.ceil(sec * fps - 1e-6)` (`frames()` in motion.js).

## Sound
- Music and SFX synthesized in code (numpy/scipy) unless a licensed track is supplied. Only use audio we have rights to.
- Music ≥ 15 dB under every spoken word, ducked. A whoosh into every move, a hit on every landing, a click on every UI action, cues on `beats.json` / `timing.json`.
- Master −14 LUFS, ≤ −1 dBTP.

## Delivery
- Finals are copied out of this folder to the repo root's `assets/` (see the root `CLAUDE.md`): `../assets/videos/<name>/` for `final_*.mp4` and `captions.srt`, `../assets/images/<name>/` for the thumbnail and approved stills, `../assets/audio/<name>/` for `mix.wav` and the chosen voice take.

## Brand and facts
- Real product UI and official logo files only: move, scale, fade, blur or mask them; never redraw, never glow over them.
- Every factual claim shows its source on screen and goes in `docs/sources.md`. Amounts illustrative. Spec ads say "Spec ad · not affiliated with X".

## Loop before showing the user anything
1. Render stills (one per beat) and LOOK at them.
2. Score 1–10 as a harsh motion director, not a proud author: hook in first 2 s, readability at phone size, motion quality, variety, composition, brand accuracy, sound sync.
3. Fix the 3 worst problems. Hunt: text overlapping on swaps, linear slides, one-frame pops, stepped blur copies, pasted-on objects, blurry or dark hero moments, dead beats, loop seam stutter.
4. Repeat until every score is 8+, at least 3 rounds. Then the full render.

## Routes (pick by the video, not by habit)
- Motion graphics, kinetic type, product/UI ads, explainers → this engine (canvas/DOM/SVG/three.js page + `seek(t)`).
- 3D scene with motion graphics (maquettes, cards, UI in space) → `templates/starter-3d/` (three.js through this engine).
- Cartoon short film / animated fairy tale with characters, a painted world and real cinematography → the `toon-film` skill (`engine/toon/`, `templates/toon-film/`, style in `refs/toon-film/STYLE.md`). Voices on Higgsfield or ElevenLabs; everything else in code.
- Many videos from one template → Remotion (`npx skills add remotion-dev/skills`), in its own folder under `code-video/`.
- The user's own talking clip with captions (a word behind the head, captions in front, depth) → the `captions-reel` skill: `tools/footage.py` + `templates/footage/` through this engine. Style lives in `refs/captions/STYLE.md`. Its captions are not the banned karaoke: up to 3 words that pop on, no highlight sweep.
- Fast captioned verticals → HyperFrames (`npx hyperframes init`), in its own folder under `code-video/`.
- Maths/science explainer → Manim (`uv add manim`).
- 3D product shot with real materials → Blender 5.2 + the `blender` MCP server in `code-video/.mcp.json` (Claude Code only loads it when started in `code-video/`; the add-on must be installed and enabled in Blender, and Blender must be running; for free CC0 HDRIs/models tick Poly Haven in the N panel → MCP for Blender). Work in a fresh .blend: the model runs real code. Headless render: `"/c/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b scene.blend -o //frames/f#### -F PNG -s 1 -e 360 -a`, then `ffmpeg -y -framerate 30 -i frames/f%04d.png -c:v libx264 -crf 16 -pix_fmt yuv420p out/silent_1920x1080.mp4`.
- Illustrated story → image-model plates from character sheets (Higgsfield connector; prompts with the repo's `realistic-image-prompter` / `realistic-image-styles` skills when the look is photographic), all motion in code.
- A real face or live footage → a video model (Higgsfield connector; prompts with `seedance-2-5-prompter` + `camera-movement`), cut into the code-rendered film.
