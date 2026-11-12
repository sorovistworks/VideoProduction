# Requests, one per step

Our wording for each step of the Load-Bearing workflow, adapted to this repo. Paste them in order (fill the
[brackets]), or hand a step to its department sub-agent with the header from `departments.md`.

## 1. Brief (two messages)
**Message 1:** Let's make cartoons in code from public-domain fairy tales. Our own characters and our own look: nothing
copied from an existing film or studio. Build a [3]-minute version of [TALE], with our angle: [ONE LINE, e.g. the wolf
is a tragically polite home inspector]. But I need to see a sample first: a 25–30 second cold open that starts on the
climax.

**Message 2:** The goal is cinema made in code, real movies. Research camera moves to use as references, bring in a
director and a DP as sub-agents. If you need something for an awesome result, ask: open-source is fine.

## 2. Quality bar
Pick a short toon film as our bar (start with `refs/toon-film/`) and study it frame by frame: every frame of its key
scenes and per-second contact sheets with timecodes. Write down what makes it work in STYLE.md, then tell me where we
need to beat it.

## 3. A studio of agents
Run this film like a small studio. You are the showrunner; every department is a sub-agent that owns its own files:
a DP for the cameras and the cut list, a character team for rigs, faces and eyes, lighting for shaders and grade, set
and effects, one animator per scene, sound, and an integrator for the engine, rendering and assembly. Departments never
edit each other's files; they leave notes. Reviewers stay outside the team: animation checkers and a blind critic
who never reads the script.

## 4. Every frame a function of time
Build the film on `templates/toon-film`: one three.js page with `seek(t)`, nothing depending on the previous frame
(fixed seeds, no clocks, effects with history simulated from the start with a fixed step and cached). Every camera in
the cut list with keyframed positions, targets, focal lengths, apertures and focus marks. 8 to 64 sub-renders per frame
for real motion blur and depth of field.

## 5. Characters from maths
Build every character in code from spheres, capsules and boxes blended into signed distance functions, meshed per pose
and cached. One base shape and a clear silhouette each, real eyelids, mouths driven by the voice tracks, clothes painted
on as regions with a clean ink line. Prove every character reads without colour.

## 6. Paint the light
Light the world like a storybook painting: one motivated key light per shot, brush texture only where light falls,
flat coloured shadows, painted skies and layers of haze. Characters clean: two tones, a soft edge between light and
shadow, an outline. Write a colour script that gives every sequence its own palette. Build the title from the story's
materials, assembling on the music's downbeat.

## 7. Score in code, voices on Higgsfield
Write the score and every sound effect in Python with numpy: modelled instruments, reverb, compression, tape
saturation, fixed seeds. Every hit on a cue sheet with its frame; measure the real onsets afterwards. Generate the
voices on Higgsfield through the Higgsfield MCP (quote the cost first), two or three takes per line, pick the best by
measured pace and clarity, mix to −14 LUFS.

## 8. Render and review every frame
Render with `engine/render-film.mjs` (chunks, workers, a blank/lost-GPU check and retry on every frame, lossless chunks,
one verified assembly). [For a long final on Higgsfield GPU: list the GPUs and prices, quote it, and start only after
my yes.] Then the animation checkers go through every shot: 12 fps contact sheets with frame numbers, close-ups at every
contact, the first three frames after every cut, and the pop metric.

Viewing notes go in plainly, e.g.: "At [0:08], when [the record scratch] hits, the camera does something strange. Hold
on the wide for a beat, then fly into a close-up, with a how-did-I-end-up-here feel." / "The animation feels broken
across the whole video, and sometimes characters clip into the set."

## 9. Overnight
Take it all the way to the final cut on your own. I want the most awesome result possible. I'm going to sleep: iterate
hard with the blind critic scoring every version, keep a changelog in `docs/reviews/`, and have the best version
rendered and delivered when I wake up.
