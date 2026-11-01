---
name: camera-movement
description: Camera-move library for Seedance 2.5 (Higgsfield) prompts, used together with seedance-2-5-prompter, that produces a specific realistic handheld camera behavior - handheld, crash zoom, voyeuristic, whip pan, walking backward, blocking the frame, exposure adjustment, focus fail. Use when the user wants a video prompt with a particular camera move, says "make it feel like someone is holding the camera", or names one of these moves.
---

# Camera movement prompts (Seedance 2.5 on Higgsfield)

Source: "How to Make Realistic Footage" by Dan Kieft (how-to-make-realistic-footage.vercel.app), video prompting section. All examples there were Seedance 2.5, 1080p.

**Core idea:** realism comes from the camera *behaving like a person holding it* - small tremor, focus changes, framing corrections. The camera paragraph is the reusable part; swap the scene, keep the camera paragraph.

## Workflow

1. Get from the user (ask only for what is missing, max one short question): the **scene/action**, the **camera move** (if not named, recommend one from the table), and **references** (image/audio, optional).
2. Pick the move from the library below. Adapt its camera paragraph to the user's scene: use their subjects, location and the trigger event that sets the move off.
3. Write the prompt with `seedance-2-5-prompter` (its layout and closing line), inserting this skill's camera paragraph per the table below. One code block, settings outside it.
4. Only generate on Higgsfield (`generate_video`, quote credits first) if the user asks. Default is prompt only.

## Output layout: owned by `seedance-2-5-prompter`

This skill supplies only the camera knowledge. The prompt itself is written with the `seedance-2-5-prompter` skill (read it and follow its layout, reference-tag rules, whole-second timing, audio syntax and closing line). Do not output the old six-section `【】` layout.

Where the camera material goes:

| Prompter section | What to put there |
|---|---|
| `[GOAL]` | Video type + subjects + one-line event + duration. Name the move ("clearly demonstrates {move} through the camera's visible behavior"). |
| `[CONTINUITY]` | Exact cast count, outfits, prop ownership, and "the operator is a separate unseen person". |
| `[STAGE n]` `Camera:` | The move's camera paragraph below, adapted to the scene. One continuous move = one STAGE. |
| `[STAGE n]` Initial state / Action sequence / End state | The Event Script, including the trigger event that sets the move off, ending on a clear result. |
| `[CAMERA AND PERFORMANCE]` | The move's hard rule(s) (the "not a cut / not a smooth rig" wording) and the imperfection cues (tremor, overshoot, focus hunt). |
| `[AUDIO]` | Dialogue in `{}` using the speech rules below; room noise and action sounds in `<>`. |
| `[EXCLUSIONS]` | The clean-image line: no camcorder overlay, REC indicator, timestamp, battery icon, focus brackets, viewfinder grid, border or subtitles; recording device never in its own field of view. |
| `[MAINTAIN CONSISTENCY]` | Cast count, identities, outfits, prop ownership, room geography, action direction; start as the main action begins, follow the camera behavior once, finish on its clear result. |

References (`@image1` etc.): bind each to a role per the prompter's rules, e.g. identity + outfit only, "copy none of its studio background".

## Move library

Each entry: feel, trigger event to write into the Event Script, camera paragraph template (`{}` = fill from user's scene), hard rule (keep the quoted wording - it stops the model from substituting a different move).

**Handheld** - feels physically held. Trigger: a sudden surprise (spill, bang).
> Handheld reaction: a third-person {framing} filmed by a separate unseen person standing in front of {subjects}. Keep {A} on the left, {B} on the right, {prop} between them. The image has continuous small irregular hand tremor. When {surprise happens}, the operator instinctively jerks backward and rolls the frame slightly sideways, then manually corrects the tilted framing to center {subjects} again. Keep {A} visible while the camera flinches. The operator's hands never enter the foreground. The perspective moves with a person holding the camera; the shot never becomes smooth or stabilized.

**Crash zoom** - surprised operator. Trigger: something unexpected appears. Start genuinely wide.
> Optical crash zoom: start with a genuinely wide view of {location} showing {subjects} small across the room. Keep the operator's feet planted in this one location. As {trigger} happens, rapidly change the lens focal length to snap into a {medium shot} of {subjects}. The background magnifies with the zoom, without forward camera travel. Show a short radial smear, slight framing overshoot and obvious temporary loss of focus, then regain focus with {what must be in frame}. Finish on this settled view.

**Voyeuristic** - secretly caught. Subjects must be unaware of the camera.
> Hidden observation: the operator stays concealed behind {foreground cover, e.g. a partly closed door}, filming through a narrow gap toward {action}. Dark edges of the cover fill much of the foreground. Slowly lean sideways just enough to uncover {subjects and action}, then pull back behind the cover again. The camera peeks from cover rather than tracking openly. {Subject} glances away from the concealed lens and remains unaware of the filming.

**Whip pan** - reactive turn toward a sound. Trigger: loud off-screen sound (engine rev, crash).
> Reactive whip pan: start in a {medium close view} of {A}. When {sound} happens, respond with one rapid horizontal rotation toward {direction}. Intervening {objects} smear sideways across the frame during the turn. Overshoot {target} slightly, correct once, then settle on {target} continuing {away}. This is a physical camera turn in the same continuous space, not a cut, zoom or forward push. {A}'s reaction remains audible after leaving the frame.

**Walking backward** - operator retreats while subject walks toward lens.
> Walking backward: {A} walks directly toward the lens while the operator physically retreats down the same {aisle/hall}. Keep {A}'s face, {prop} and {B} in view. Each backward footstep produces uneven vertical bob and a small roll; nearby {edges, e.g. cubicle walls} slide past faster than the distant background. Correct the framing once while continuing backward. {A}'s size stays approximately steady because both people move. Do not replace this retreat with a stationary lens zoom or a smooth tracking rig.

**Blocking the frame** - someone passes close to the lens; focus recovers. Makes space feel busy.
> Brief foreground obstruction and focus recovery: start looking across {setting} at {A}. {Passer-by} makes one continuous crossing directly in front of the lens. {Bright prop} fills the near foreground and briefly blocks {A}. Autofocus briefly grabs the close {prop}, leaving {A} blurry. After it has cleared the lens completely, the operator immediately corrects focus onto {A}'s eyes and mouth. {A}'s face visibly changes from blurry to crisp, with fine details resolved. Hold {A} sharply in the final composition. The operator reframes slightly upward to center {A}'s face during recovery. Keep the same viewpoint and uninterrupted moment.

**Exposure adjustment** - auto-exposure reacting. Trigger: moving dark interior to bright exterior (or reverse). Works shorter (no cast-lock boilerplate needed).
> One uninterrupted handheld shot from behind {A}'s left shoulder, following {him/her} through the doorway. The camera starts correctly exposed for the {dark room}. Entering {sunlight} briefly washes the entire image nearly white. Automatic exposure then visibly lowers the brightness until {A} and {subject} become readable together. Natural footstep bob, small framing corrections and fine film grain.

**Focus fail** - mockumentary awkward zoom. Trigger: a subject looks into the lens.
> Mockumentary handheld: a third-person {medium two-shot} filmed by a separate unseen person. Continuous small irregular hand tremor. The moment {A} looks into the lens, the camera performs a fast, slightly clumsy optical zoom toward {A}'s face, ending in a tight close-up. The camera body stays where it is; only the lens zooms in. During the zoom the autofocus fails: {A}'s face goes soft and blurry, the focus hunts past once, then snaps back sharp on {the expression}. {B} drifts out of frame as the zoom tightens. The operator's hands never enter the foreground. The shot never becomes smooth or stabilized. Faint lens-zoom motor whir.

## Library enhancement (every run, with permission)

This applies whether the run started here or in `seedance-2-5-prompter`. After delivering the prompt, check for a candidate:
- a camera move was **created** by you for this prompt that is not in the library (e.g. dolly-in creep, rack focus pull, drop-and-recover);
- the user **showed or pasted** a new move or prompt (including the "camera handover" prompt listed under Not captured);
- the user **corrected** a move's camera paragraph, hard rule or trigger, or said it produced the wrong move.

If there is one, show the exact proposed entry (name, feel, trigger event, camera paragraph with `{}` slots, hard rule "not a ..." wording) and where it goes, then **ask with AskUserQuestion before editing this file**: "Add to library" / "Edit first" / "Skip". Never edit without a yes. Also update the `description` move list and drop the item from "Not captured" if it was covered. If nothing new came up, say nothing. Never delete or overwrite an existing move unless it is what the user asked to change.

## Rules (apply to every output)

- **One move per shot.** "Follow the camera behavior once." Do not stack moves; if the user wants several, write separate shots.
- **Name what the move is NOT** (not a cut, not a zoom, not a smooth tracking rig). The model substitutes cleaner moves otherwise.
- **Operator is unseen and separate from the cast.** State it in Subjects. Never let the subject be the camera holder.
- **Exact cast count.** Say "exactly N" and describe supporting cast with faces/outfits clearly different from the referenced person.
- **Trigger event drives the move.** The camera reacts to something in the Event Script (spill, engine rev, passer-by); write that event explicitly.
- **Clean image:** always repeat the no-overlay line (no REC, timestamp, battery, brackets, grid, border, subtitles).
- **Start/finish:** begin as the main action begins; end on a clear result (a face, a prop, the settled framing).
- **Imperfection comes from the move**, not from graphics.

### Speech rules (only if someone talks)
Say the exact lines in quotes or describe a brief reaction. Add: "Require actual intelligible spoken words; laughter accompanies speech instead of replacing it. {A} is the only featured speaker, voice clearly audible above background noise, visible mouth movements match the words. Preserve natural room noise and the action's own sounds." If another character speaks, give them a clearly different voice and state "each line comes only from its own speaker". For silent clips say "no dialogue".

## Settings line (append after the prompt)

`Seedance 2.5 · 1080p · {duration} · {aspect} · refs: {list or none}`

- Reference tag syntax varied in the source (`@Image 1`, `@image1`, `<<<image_1>>>`). Default to `@Image 1` / `@Audio 1`; use whatever the Higgsfield UI inserts if the user says it differs.
- Higgsfield also has a 480p draft mode in Seedance - suggest it to test a camera paragraph cheaply before a final 1080p run.

## Multi-shot variant (found-footage compilation)

For several quick cuts instead of one continuous take, use the compilation structure from the source: `[GOAL]`, `[CONTINUITY]` (named characters with fixed outfits), `[RHYTHM]` (one action per clip, hard cut right after impact), `[SHOT n | start-end s]` lines each ending "HARD CUT.", `[VISUAL STYLE]` (cheap phone/2000s camcorder, autofocus hunting, auto-exposure pumping, blown highlights, low bitrate), `[CAMERA AND PERFORMANCE]` (whip pans that overshoot, crash zooms that go too far), `[AUDIO]`, `[EXCLUSIONS]` (no UI/timestamp/watermark/logos), `[MAINTAIN CONSISTENCY]`. About 1.5 s per shot, 10 s total. Name camera moves per shot (e.g. "Clumsy crash zoom onto X, focus hunts and snaps back").

## Not captured

The site's "camera handover" demo (steady start, handoff to another person, handheld finish) exists only as a video, with no prompt text on the page, so it is not in this skill. Ask the user to paste that prompt if they want it added.
