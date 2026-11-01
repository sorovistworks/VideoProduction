# Brief templates

Fill the [brackets] and paste after the `code-video` skill, or give the filled brief to Claude directly.
Use xhigh effort (`/model`) for new videos, medium for fixes.

## 0. Smoke test (checks the setup, output looks like everyone's)
make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out.

## 1. Product / launch ad
Make a dynamic [20]-second motion graphics video for [PRODUCT] ([URL]), with the energy of a motion designer's showreel.
Assets: visit the site, take real screenshots (Playwright), the real logo, colours and fonts into ./assets, list them before animating. Never redraw the UI from imagination; crop and animate the real thing.
Story (one beat each, 2 to 4 s): 1. Hook: the problem in 5 words of huge kinetic type. 2. The product appears, the UI assembles piece by piece. 3. Three features, each a UI moment with a cursor doing a real action. 4. One number that proves it: [REAL METRIC + source]. 5. Logo lock-up + [CTA].
Voice: [script or "write ~50 words"], [voice style]. Music: original, [120] BPM, synthesized; UI clicks and whooshes on the beat.
Formats: 9:16 first, then 16:9 and 1:1 from the same timeline.

## 2. Spec ad (portfolio piece for a brand)
GOAL: a spec ad for [BRAND], built entirely in code, [19] s + 2 s end card, 60 fps, 16:9 and a real 9:16 re-layout. Jaw-dropping but premium and readable on a phone.
LOOK: [stage colour + drifting glow in brand colour], fine grain, heavy motion blur, [ONE font family], one accent: [brand colour hex]. Photoreal UI, never cartoon. [One continuous shot: scenes hand over through a camera move, rack focus or shape morph | a cut every ~1.5 s].
CONCEPT: "[one line]". One visual thread runs through every scene: [e.g. a red line of light / a yellow route].
BEAT SHEET: [time range → what happens → the VO word it lands on], hook slams on the first downbeat, logo lands on the final hit.
VOICE-OVER: [narrator], whole script in one call, 2 takes, re-time picture to voice: "[script]"
SOUND: original score [BPM, key], ≥ 15 dB under every word, digital silence before the logo hit; whoosh into every move, hit on every landing, click on every UI action. −14 LUFS, ≤ −1 dBTP.
BRAND: official logo files only moved/scaled/faded/masked, pixel-exact at rest, no glow over them. Fictional titles, stock images, never real artwork. Claims only with an on-screen source. "Spec ad · not affiliated with [BRAND]". End card: [your signature].
PROCESS: research → three motion directions, judged → brief with timings → build in parallel packages → preview + contact sheet → art-direction critique → frame-level motion audit → 9:16 re-layout → finals.

## 3. Looping UI state film (one shape never cuts)
<inputs>Ask me for: product + URL, 8 to 12 UI states that tell its story, the real data in each, brand colours + fonts + one accent, a track near 120 BPM (or synthesize), formats.</inputs>
<direction>Product-film UI motion. One container never cuts: every state is the same element changing size, radius and fill while its content swaps behind a short blur. A cursor drives every change. Warm neutral canvas, one accent. Springs with at most a tiny overshoot. Banned: bouncy easing, glows, gradients on UI, particle bursts, dead time.</direction>
<structure>120 BPM, 8 bars, something on every beat. [logo → button → field (typed) → loader → success → card → chart draws → tooltip → menu → notification → logo]</structure>
<build>window.seek(t); track() for every multi-target value; text inside a morphing container enters after the morph starts and leaves before the next; start on a downbeat; UI sounds on measured hits.</build>
<gotchas>The last frame must equal the first, cursor position and speed included.</gotchas>
<start>Ask for the inputs, then show me the state list on the beat grid before writing code.</start>

## 4. Kids' story (felt and paper, all code)
Write a [40]-second kids' story: one hero, a goal, a big exciting moment, a happy ending. Narration max [90] words starting "Once upon a time…", 14–16 scenes of 1.5–3 s each (what's on screen, what moves). Save docs/script.md.
Then, after the voice and timing.json exist: build it at 16:9 in code. SVG kit first: a felt filter (feTurbulence + feDisplacementMap fuzzy edges, feDiffuseLighting fibre texture, soft shadow), a smoother paper filter, dashed stitch lines, bead eyes. Characters from felt shapes in separate groups so parts move. Bright palette, navy for night. One scene per narration phrase, starting 0.15 s before its first word; story words pop in on cue in a storybook serif, key words coloured. Constant motion: slow push, bounces, squash and stretch, particles, paper scallop wipes, screen shake on the big moment. Ending card: [keyword + CTA].

## 5. Illustrated story (image-model plates, motion in code)
Approve in order: hero model sheet (turnarounds + 6 expressions, one accessory, natural anatomy, "not 3D, not vector, not chibi") → friends sheet using the hero sheet as reference → empty master background → ~15 scene plates each referencing background + sheets ("full-bleed 16:9, no border, no text", lock the hero's best angle) → prop sheet on flat plain background for cut-outs.
Then a renderer moves a virtual camera over each plate with props in plate space, code effects, subtitle-style words on timing.json, line boil on 4s, grain, vignette. Acting poses: the image model redraws only the moving part; align with ORB + RANSAC homography, keep only changed pixels, colour-match, feather, swap on the action word.

## 6. Long-form / overnight director's brief
You are the director, animator, sound designer and render engineer for a [DURATION] film made in code. Treat this as a multi-session production. Don't rush to a final render.
The film in one line: [LOGLINE + what the viewer should feel at the end].
References and inputs: ./refs/ [video / frames / images], take the grammar never the content. [./audio/track.wav: unchanged, measure beats first.] APIs in .env: [keys]. Budget: [$X].
Look: [palette, type, texture, camera language, banned looks].
Beat sheet: 0:00–0:02 hook [most striking image] · [acts] · a payoff every 3–5 s · the last frame sets up the first.
Workflow with gates: style_guide + shotlist → stills for every shot + contact sheet → low-res rough cut with placeholder audio, fix pacing → full animation → polish → sound → final render. For long films write docs/ANIMATION_GUIDE.md first, then split chapters across subagents.
Critique loop: every shot, at least 3 rounds, scores and the 3 biggest problems logged in docs/review_log.md, until all are 8+.
Deliverables: out/final.mp4, out/loop_check.mp4, out/poster.png, out/contact.png, README.md.
