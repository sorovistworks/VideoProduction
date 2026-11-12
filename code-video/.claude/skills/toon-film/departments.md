# The studio: departments as sub-agents

Claude is the **showrunner**: holds the brief, the script and the schedule, spawns the departments, merges notes,
decides. Every department is a sub-agent that **owns its files** and never edits another department's files.
Need a change elsewhere? Write it in `docs/notes/<owner>.md` (who, what, why, the frame or shot) and the owner does it.
Every department test-renders the same project at the same time, so **the page must load after every save**:
after each change run `node engine/render.mjs projects/<name> --stills <a time in your shot> --query samples=1`
and look at the PNG. A department never leaves the project broken.

Paste this header into every department brief, then its own section:
> You are the <department> of a small animation studio making "<title>" in `code-video/projects/<name>/`
> (rules: `code-video/CLAUDE.md`, the kit: `.claude/skills/toon-film/SKILL.md`, style: `refs/toon-film/STYLE.md`).
> You own only: <files>. Read `docs/notes/<you>.md` first and clear it as you go. Leave notes for others in their file.
> After every save, render one still of your work with `--query samples=1` and look at it. Report what you changed,
> what you checked, and the stills' paths.

| Department | Owns | Brief |
|---|---|---|
| **Director of photography** | `film/cutlist.js`, `docs/shotlist.md` | Every camera and the cut. Keyframed position, target, focal length, aperture and focus mark per key; `samples` and `shutter` per shot (≈8 for still shots, up to 64 for fast moves, 45° shutter for crisp poses); `world` maps for freezes and rewinds. Seams between shots are contracts (same camera state on both sides of a match cut). Research real camera moves for the key beats. The camera never sits dead still. |
| **Character team** | `film/cast/*.js` | Rigs, faces, eyes. Each character from spheres/capsules/boxes blended in `sdf.js`: one base shape, a clear silhouette, real eyelid shells, a carved mouth driven by `lipsync`, clothes as painted regions with ink. Silhouette test, turnaround, expression sheet, scale line-up. Mesh time per pose stays under ~0.4 s (use `cellFor`, cache repeating poses). |
| **Lighting** | `film/colorscript.js`, `docs/colorscript.md`, grade | Storybook light: one motivated key per shot, brush only where light falls, flat coloured shadows, painted skies, haze. Characters clean (two tones, soft terminator, ink). A colour script with a palette per sequence and blends at story turns. Glow only on real light sources. |
| **Set & effects** | `film/sets/*.js`, `film/fx/*.js` | Worlds and effects. Materials that read at a glance (straw, sticks, brick). Effects with history (debris, storms, smoke) are `cachedSim` from the start with a fixed step: no state between frames. Props with readable text for gags. |
| **Animators** (one per scene) | `film/scenes/<scene>.js` | Poses as pure functions of WORLD time: anticipation, action, follow-through, overlap; holds that breathe; blinks; feet planted (no sliding), hands on props, no clipping into the set. Use `spring`/`track`. Lip sync from `lips.mouth()` while lines play. Never touch the camera. |
| **Sound** | `audio/score.py`, `audio/takes/`, `docs/voices.json`, `docs/cues.json` | Score and every effect in numpy from fixed seeds (modelled instruments, reverb, compression, tape). Times only from `docs/cutlist.json` (cuts + events). Every hit on the cue sheet; verify onsets with `tools/cues.py`. Voices: 2–3 takes per line on Higgsfield/ElevenLabs (credits need the user's yes), best by `tools/takes.py`. Music ≥ 15 dB under words; master −14 LUFS. |
| **Integrator** | `index.html`, the build, renders, assembly | Engine glue, per-sample update order (mesh once per frame, root/eyes/camera per sample), render settings, chunk renders, assembly, delivery. Runs `render-film.mjs`; keeps `window.EVENTS` and `window.CUTS` current. Owns the fix when an engine-level bug clears a whole class of defects at once. |

## Reviewers stay outside the team
- **Animation checkers** (3, each a third of the film by shot): never fix, only report. Inputs: the latest draft and
  `uv run tools/anim_review.py <draft> --shots <their shots>` output, plus `--at <t> --crop x,y,w,h` close-ups at every
  contact. Report one line per defect: `shot · frame · what · visible at normal speed? (y/n) · owner`. Look for hands
  through props, floating or sliding feet, one-frame pops (`pops.txt`), bodies clipping the set, eyes through lids,
  ghosts on the first frames after a cut, flicker, stepped motion blur.
- **Blind critic**: NEVER reads `docs/script.md`, `docs/shotlist.md` or the code; gets only the rendered film
  (contact sheets from `node tools/review.mjs <film>` and `anim_review.py`) and the reference film's sheets. Scores
  1–10 on eight axes: **story clarity, character appeal, character rendering, acting/animation, world/sets, light and
  colour, camera and cutting, polish (artefacts, sound sync)**, with one sentence of evidence each, then names the
  single change that would raise the total most. When scores stall, score paired stills (ours vs the reference, same
  kind of shot) on the same axes to find where we lose. Never flatters: version 1 of Load-Bearing scored 6.5.

## Integrator → Cloud render (Higgsfield GPU)
Local rendering is the default. For long finals on cloud GPUs, through the Higgsfield MCP:
1. `gpu_list_gpus` (or `/gpu`, `gpu_explore`): show GPU types and credits per hour; estimate hours from a local
   measurement (`render-film` prints fps); the user approves the box and hourly price. Nothing is rented before that.
2. Files in and out need a channel the user sets up first (a git remote the box can pull the project from, and
   somewhere to upload the chunk files, e.g. presigned URLs the user creates). Never type the user's credentials anywhere.
3. `gpu_rent` → `gpu_rental_exec` (≤ 90 s per call; long work with `nohup … &` and poll the log): install Node 20+,
   ffmpeg, `npx playwright install --with-deps chromium`, pull the project, check the GPU is idle (`nvidia-smi`;
   a shared GPU ran 5–10× slower), then `node engine/render-film.mjs projects/<name> --chunks a-b --workers 8`.
4. Upload `out/chunks_*/c*.mkv`, download them into the same folder locally, `--assemble` (frame counts are verified).
5. `gpu_rental_stop` the moment the frames are home. It bills every minute until stopped.
