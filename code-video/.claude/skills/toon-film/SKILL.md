---
name: toon-film
description: Make a 3D cartoon short film entirely in code (three.js, no video model, no image generator, no Blender, no downloaded models) — characters sculpted from signed distance functions, a painted storybook world, a real camera cut list with lenses, motion blur and depth of field from 8–64 sub-renders per frame, a numpy score, voices on Higgsfield/ElevenLabs, rendered frame by frame and reviewed frame by frame. Run like a small studio of sub-agents. Use when the user asks for a cartoon, animated short, fairy-tale film, toon film, "a film like Load-Bearing", "cinema made in code", or a cold open / sample of one.
---

# Toon film: a cartoon made in code

The workflow behind Higgsfield's "Load-Bearing" (a 2:56 cartoon whose every frame was drawn by code), rebuilt for this
repo. Read `code-video/CLAUDE.md` first (render contract, voice-first, sound, delivery): every rule there applies.
Run every command from `code-video/`. The house style is `refs/toon-film/STYLE.md`; the reference film and its contact
sheets sit next to it (local only). Companion files in this skill folder:
- `departments.md`: the studio. Who owns which files, each sub-agent's brief, the notes protocol, the reviewers.
- `requests.md`: the request for each step, ready to paste (also what to send a sub-agent).
- `lessons.md`: what breaks and how it was fixed. Read before the first full render.

## The kit (already built, do not copy into projects)
| Piece | File | What it does |
|---|---|---|
| Cut list | `engine/toon/cutlist.js` | shots with keyframed position, target, focal mm, f-stop, focus, roll; Hermite curves with handles (frame 0 already moving); `world(t)` per shot for freezes and rewinds |
| Film renderer | `engine/toon/film.js` | 8–64 sub-renders per frame: shutter (motion blur), lens (DOF), sub-pixel (AA); clamped to the shot; grade pass; blank/lost-GPU `frameCheck()`; shader errors stop the render |
| Characters | `engine/toon/sdf.js` | spheres, ellipsoids, capsules, boxes, tori blended (smooth union / carve) → surface nets mesh per pose, cached; paint regions + ink edges; faces shaded from a smooth head; finer mesh in close-ups |
| Look | `engine/toon/shade.js` | toon character material (two tones, soft terminator, fwidth ink), inverted-hull outline, painted world material (brush only where lit), painted sky, key + ambient + fog rig, glow for real lights, colour script `paletteAt()`, silhouette mode |
| Effects | `engine/toon/sim.js` | fixed-step simulations from the start, checkpointed: any frame in any order, freeze and rewind for free |
| Lip sync | `engine/toon/lipsync.js` + `tools/lipsync.py` | loudness opens, high-frequency share widens/rounds, one frame ahead, phrases end shut |
| Props | `engine/toon/props.js` | ground with hills, wind-blown instanced grass, painted trees, rocks |
| Render | `engine/render-film.mjs` | chunks × workers, per-frame checks + retry in a fresh browser, lossless chunks, one verified assembly; `--meta` writes `docs/cutlist.json` |
| Review | `tools/anim_review.py` | 12 fps contact sheets with frame numbers per shot, first frames after every cut, contact close-ups, pop metric |
| Sound | `tools/sound.py`, `tools/cues.py`, `tools/takes.py` | instruments, reverb, compression, tape, varispeed, record scratch, heartbeat; cue sheet + measured onsets; take picker |
| Template | `templates/toon-film/` | a working 11.5 s cold open (Nib the mole, a dusk meadow, a sneeze-gust, a time-freeze fly-in, a rewind) split by department |

## Order of work (stop at every GATE for the user's OK)

### 1. Brief (two messages, `requests.md` §1)
A public-domain tale (or the user's own story) told with **our own characters, look and angle**, never the look of an
existing film or studio. Length, format (16:9 default, 24 fps), tone, and the one-line angle (Load-Bearing's: the
wolf is a tragically polite home inspector). Always **a sample first**: a 25–30 s cold open that starts on the climax.
Ask what is missing in one message. GATE.

### 2. Set the quality bar
Pick a reference (from `refs/toon-film/` or one the user brings) and study it frame by frame: per-second contact sheets
with timecodes (`uv run tools/anim_review.py <ref.mp4> --fps 1`) and every frame of its key scenes
(`--at <s> --n 24`). Write or refresh `refs/<genre>/STYLE.md`. Research camera moves for the key beats. Grammar only.

### 3. Open the studio
`projects/<kebab-name>/` from `templates/toon-film/` (copy `index.html film/ audio/ docs/ assets/`). Replace the sample
cast/set/scene with the film's own, keeping the file split. Spawn departments as sub-agents with the briefs in
`departments.md` (each owns its files, leaves notes in `docs/notes/`). The integrator keeps the page loading after
every save: `node engine/render.mjs projects/<name> --stills board --query samples=1`.

### 4. Script, shots, colour
`docs/script.md` (voice lines short, air around them, a narrator if it helps), `docs/shotlist.md` (shot, lens, move,
what it shows, the gag), `film/cutlist.js` (DoP), `docs/colorscript.md` + `film/colorscript.js` (lighting).
Boards: `--stills board --query samples=1`. GATE: script, shot list, colour script, boards.

### 5. Voices first
Generate on Higgsfield through the Higgsfield MCP (`list_voices` → `generate_audio` with `model: 'text2speech_v2'`,
`variant: 'elevenlabs'`, `voice_type` + `voice_id`; `get_cost: true` first and show the cost) or the ElevenLabs
connector. **Two or three takes per line.** Spending credits needs the user's yes. Save takes in `audio/takes/`, pick with
`uv run tools/takes.py "<line>" <take files…>` (measured pace and clarity), list the chosen lines with their film
time in `docs/voices.json`, then `uv run tools/lipsync.py projects/<name>/docs/voices.json -o projects/<name>/docs/lipsync.json`.
Re-time the cut list to the lines, never the lines to the cut list. GATE: the user approves the takes.

### 6. Characters
One base shape each, a clear silhouette, real eyelids, a carved mouth, clothes as painted regions with ink. Check:
silhouette test (`--query "silhouette&samples=1"`: every character must read in black), a turnaround and expression
stills, true relative scale side by side. GATE on character stills.

### 7. Build every shot
Sets, light, animation. Stills per shot (`--stills <t…>`), the critique loop from `code-video/CLAUDE.md` (score as a
harsh director, fix the 3 worst, at least 3 rounds). Debug views: `--query debug=normals`, `--query debug=albedo`.

### 8. Sound
`node engine/render-film.mjs projects/<name> --meta` (cuts + `window.EVENTS` → `docs/cutlist.json`), then
`audio/score.py` on `tools/sound.py` + `tools/cues.py`: every hit on the cue sheet with its frame. Run it, then
`uv run tools/cues.py projects/<name>/audio/sfx.wav projects/<name>/docs/cues.json` (within one frame).

### 9. Render
Draft: `node engine/render-film.mjs projects/<name> --draft` (1 sample/frame). Final: `node engine/render-film.mjs
projects/<name>` (each shot's own samples). Re-render only what changed: `--from <s> --to <s> --redo`. Long films:
split chunks across machines (`--chunks a-b`), copy the `out/chunks_*` files home, `--assemble`. Cloud GPU (Higgsfield
GPU, `/gpu` or `gpu_list_gpus`): see `departments.md` → Integrator → Cloud render. Never rent before the user approves
the hourly price; stop the box the moment the frames are back.

### 10. Review every frame (`requests.md` §8, §9)
- **Animation checkers** (3 sub-agents, a third of the film each): `uv run tools/anim_review.py <draft> --shots …`:
  12 fps sheets with frame numbers, first 3 frames after every cut, close-ups at every contact (feet on the ground,
  hands on props, bodies near the set), the pop list. They report defects with frame numbers; owners fix.
- **Blind critic** (a sub-agent that never reads the script): watches the render (contact sheets + the mp4 through
  `review.mjs`), scores 8 axes, and when stuck compares paired stills against the reference on the same axes.
Iterate until the critic's scores stop rising for the reason it named. With "take it to the final cut on your own",
loop render → review → fix without stopping, keep a changelog in `docs/reviews/`.

### 11. Finish and deliver
`node tools/finish.mjs projects/<name>` (−14 LUFS / −1 dBTP), captions from the voices if wanted
(`uv run tools/words.py audio/mix.wav -o docs/timing.json` → `tools/srt.py`), thumbnail via `thumb.html`.
Deliver to the repo root `assets/` (`videos/<name>/`, `images/<name>/`, `audio/<name>/`) and list every path.
Say what the critic would fix next.
