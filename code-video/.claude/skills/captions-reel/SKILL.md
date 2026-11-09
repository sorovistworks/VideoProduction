---
name: captions-reel
description: Edit the user's own talking clip into a captions reel — a word behind their head (cut-out + depth), word-timed captions in front, a moving virtual camera, an optional swapped room, cleaned voice and a sound on every move. Use when the user gives a talking-head / phone clip and asks for captions, "a word behind my head", a captions reel, text behind the subject, or to build their own caption style.
---

# Captions reel on real footage

Follow `code-video/CLAUDE.md` and run every command from `code-video/`. Talk to the user in plain words; don't show code unless asked. Stop at each GATE.

## 1. Ask (one message)
- The clip (best: 5–10 s, vertical, space above the head, light on face and hair). Several takes → which one.
- Which word goes behind the head (or "you pick": the word that carries the line, a number or the thing being talked about). More than one is fine, one per line.
- Brand or product names they say, to spell them right.
- Room swap? Beeble (external, relights to match) or a local swap from a picture (no relight). Voice clean-up? Adobe Podcast (external) or local `--clean`.
- Style: start from `refs/captions/STYLE.md`. If they have 3–5 reels they'd steal from, they go in `refs/captions/`; break each down (fonts, sizes, how words come in and leave, where they sit, what moves) and ask which bits to take.

## 2. Set up
`projects/<kebab-name>/` from `templates/footage/` (copy `index.html`, `docs/`, `audio/`). Put the clip at `projects/<name>/clip.mp4`.
- Room via Beeble: the user uploads the take plus a picture of the room at beeble.ai and downloads the relit clip. Use that clip from here on.
- First run downloads the cut-out model (~1 GB into `code-video/.models/`) and the speech model (~0.5 GB). Tell the user before, and that it can take up to half an hour on a slow connection.

## 3. Words (GATE)
1. `uv run tools/footage.py projects/<name>/clip.mp4 projects/<name> --no-cutout [--clean]` — frames, colour and voice only; the cut-out comes after the words are approved.
2. `uv run tools/words.py projects/<name>/audio/voice.wav -o projects/<name>/docs/timing.json` — prints `index:word` on one line, doubtful words marked `(?)`. Starts are already snapped to where the audio gets loud.
3. Show the words in one line with brand names spelled right. Mark anything that looks wrong or made up and any phrase that doesn't make sense. GATE: wait for the OK. Fix words in `timing.json` by hand; a fixed word keeps the times of the word it replaces.
4. Write `docs/captions.json`: `"behind": [<index of each big word>]`, `"accentWords": [...]` (one a line at most). Every other field in the DEFAULTS block of `index.html` can be set here too.

## 4. Cut-out
`uv run tools/footage.py projects/<name>/clip.mp4 projects/<name> --from <first big word start, minus 0.1>`, or `--from 0` when the room is swapped locally (`"room": "assets/room.jpg"`). It prints the time per frame after the first one: tell the user roughly how long, run it in the background, and keep them posted. A stopped run resumes.

## 5. Storyboard (GATE)
`node engine/render.mjs projects/<name> --w <W> --h <H> --stills board` (W, H, fps from `docs/footage.json`): one still per line. LOOK at each one. Check that the head covers the big word's lower part (the page logs `cover` per word; 0.15 or more), captions sit above the big word between 15% and 65% of the height and away from the right-side buttons, and that nothing is captioned twice. Show the stills.

## 6. Cut, sound, final
- `node engine/render.mjs projects/<name> --w <W> --h <H> --fps <fps> --sub 1` (same size and rate as the clip; colour tags carried as BT.709).
- `uv run projects/<name>/audio/score.py`: a whoosh and hit on each big word, a quiet tick on each caption word, all under the voice. Add the user's own sound library with `place(sfx, load(path), t, gain)` on the frame where that thing happens on screen. Add music only if supplied or asked for, ducked.
- `node tools/finish.mjs projects/<name>` → `out/final_<W>x<H>.mp4` at −14 LUFS. Report the numbers.
- `node tools/review.mjs projects/<name>/out/final_<W>x<H>.mp4 --at <big word time>`: read `wave_at.png`. Every caption lands on its syllable; a word 3 frames late is felt. Then watch with sound on.
- Save a PNG while the big word is showing: `--stills <big word start + 0.3>`.

## 7. Notes, rounds, rules
- Ask what to change: the word, its size or position, font, colour, caption style. The user can freeze the preview at a moment (`npm run preview` → `projects/<name>/?t=3.4`) and leave notes as `docs/notes.md` lines: `3.40s: this word comes in late`. Render a still at each note's time before and after the fix.
- Change only what is asked, in `docs/captions.json` (or `timing.json` for timing), then render again plus a new PNG. A moved word stays where the user put it (`{"i": 7, "y": 0.28}`), even if the head then covers less of it. Keep captions above it.
- When something lands, ask whether to save it as a rule in `refs/captions/STYLE.md` under "House rules", so the next reel starts from it.

## 8. Deliver
Copy into the repo root's `assets/` (root `CLAUDE.md`): `out/final_*.mp4` → `../assets/videos/<name>/`, the PNG → `../assets/images/<name>/`, `audio/mix.wav` + `audio/voice.wav` → `../assets/audio/<name>/`, and `uv run tools/srt.py projects/<name>/docs/timing.json -o ../assets/videos/<name>/captions.srt`. Give every full path.
