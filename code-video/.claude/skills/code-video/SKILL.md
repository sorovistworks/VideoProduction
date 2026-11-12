---
name: code-video
description: Make a video rendered entirely from code (Category 2) — product/launch ad, spec ad, showreel, explainer, kinetic type, kids' story, illustrated story, or a long-form director's brief. Use when the user asks to make, start, or plan a code-rendered video, reel, ad, or animation.
---

# Make a code-rendered video

Follow `code-video/CLAUDE.md` for every rule, and run every command from `code-video/`. This is the order of work. Stop at each GATE and wait for the user's OK.

## 1. Brief
Collect what is missing, in one message:
- What it is and for whom; duration; formats (16:9, 9:16, 1:1).
- Product/brand + URL (real UI and logo files only), or the story.
- A reference: a frame, a video, or a folder of images. If none, ask once; it is the biggest quality lever.
- Voice: script or "write it"; voice style. Music: licensed file or "synthesize".
- Signature / call to action for the end card.
Pick the template from `templates/briefs.md` and the route from CLAUDE.md "Routes". A cartoon short film (characters, painted world, real camera) follows the `toon-film` skill instead of the steps below.

## 2. Research, script, shot list
`projects/<kebab-name>/` from `templates/starter/` (2D) or `templates/starter-3d/` (three.js): copy `index.html`, plus `assets/ audio/ docs/`. For Blender, Remotion, HyperFrames or Manim shots, follow that route in CLAUDE.md and composite the frames in.
- If a URL was given: Playwright screenshots, logo, colours, fonts into `assets/`, and list what was found.
- References live in `refs/<genre>/`. Pick the genre folder that fits (ask if unclear).
  - If that folder has media but no `STYLE.md`, or files newer than it, or the user says "refresh": extract frames from each video (`ffmpeg -i <ref> -vf fps=2 docs/ref/<name>_%03d.png`), study them and the images, and write `refs/<genre>/STYLE.md`: hex palette, type (family, weight, spacing), shot lengths, transitions, camera moves, texture, how text enters/exits, sound feel, what to avoid, and which file each trait came from. Show it to the user.
  - If `STYLE.md` exists and is current, start from it instead of re-studying.
  - When the brief mixes references ("type from X, camera from Y"), take each trait only from its named source.
  - Write the project's `docs/style_guide.md`: the genre style plus this video's specifics. Take the grammar, never the content.
- **Facts:** every claim goes in `docs/sources.md` (claim → source URL → date checked). Numbers come from data pulled and computed in code (`docs/data/` + the script that made them), never from memory. Then a separate fact-check pass that tries to disprove each claim; fix or cut what fails.
- **Script:** write five hooks, score them (clarity at a glance, curiosity, payoff promised), show the top two. Beats with `[ON SCREEN: ...]`, written for the ear. Save `docs/script.md`.
- `docs/shotlist.md`: beats with timings, one idea per beat, hook in first 2 s, payoff every 3–5 s, what moves in each.
GATE: show sources (with any failed checks), script with both hooks, shot list.

## 3. Voice first
- Generate with the ElevenLabs connector (or the API key in `code-video/.env`): whole script in one call, mood tags, 2+ takes. Save as `audio/voice.mp3`.
- `uv run tools/words.py projects/<name>/audio/voice.mp3 -o projects/<name>/docs/timing.json`, then `uv run tools/scriptdiff.py <script text> <timing.json>` and report missing/changed words.
- Map each shot to the word it starts on; scenes start ~0.15 s before their first word. Store shot times in the page from `timing.json`, never hand-typed guesses.
- With a music file: `uv run tools/beats.py <track.wav> -o <docs/beats.json>`.
GATE: the user picks the take.

## 4. Stills
Build `index.html` (`window.seek(t)`, `window.DURATION`). Render one still per beat:
`node engine/render.mjs projects/<name> --stills <t1,t2,...>` and LOOK at every PNG.
Run the critique loop from CLAUDE.md (score, fix 3 worst, repeat to 8+).
GATE: show the stills and scores.

## 5. Motion
`--draft` render → `uv run tools/motion_audit.py <draft.mp4>` + `node tools/review.mjs <draft.mp4> --at <fastest moment>` → read contact/phone/strip → fix. Frame-level audit: stepped blur copies, one-frame pops, text sliding to re-centre, pasted-on objects, dark or blurry heroes, seams that don't match. At least 3 rounds.

## 6. Sound
Write `audio/score.py` on `tools/sound.py` (see the example in its docstring): original music on the beat grid, SFX cues read from the same times the picture uses (`timing.json` / the page's shot list): whoosh peaking on every move, hit on every landing, click on every UI action, silence before the big hit. Music sits ~15 dB under the voice, then `duck()` under it. `uv run projects/<name>/audio/score.py` → `audio/mix.wav`.

## 7. Final
- Full render per format (`--w 1080 --h 1920` for 9:16; re-check its stills first, it is its own layout).
- `node tools/finish.mjs projects/<name>`: masters every format to −14 LUFS / −1 dBTP and prints the measured numbers. Report them.
- `node tools/review.mjs projects/<name>/out/final_1920x1080.mp4` and read `wave.png` against the shot times: every hit on its frame.
- If there is narration: `uv run tools/srt.py projects/<name>/docs/timing.json -o projects/<name>/out/captions.srt`.
- Thumbnail if wanted: `thumb.html` (≤ 3 words, readable at 320 px wide, same look as the film) rendered at 1280×720 (CLAUDE.md).
- Deliver into the repo root's `assets/` (root `CLAUDE.md`), creating the folders: `out/final_*.mp4` + `captions.srt` → `../assets/videos/<name>/`, thumbnail + approved stills → `../assets/images/<name>/`, `audio/mix.wav` + chosen voice take → `../assets/audio/<name>/`. Give the user every delivered path. Say what you would improve next. Nothing is published from here; disclose synthetic content where a platform asks.
