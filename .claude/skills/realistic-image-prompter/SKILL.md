---
name: realistic-image-prompter
description: Write ready-to-paste photograph-like image prompts (Higgsfield image models such as Nano Banana Pro, Flux 2.0 Pro, Cinema Studio Image) using the CTLT structure - Camera, Tone, Lighting, Texture. Use when the user wants an image prompt, a realistic or candid photo look, a character/reference image, a start frame for video, or says "CTLT". This skill writes text; it does not generate media unless the user asks.
---

# Realistic image prompts (CTLT)

Source: Dan Kieft's "Realistic Image Prompt Template" and the "How to Make Realistic Footage" page. Works even when the scene is surreal: realism comes from the camera, not the subject.

## Workflow

1. Take the idea from the user. Ask (max one short question) only if camera look or references would materially change the result; otherwise choose a coherent camera yourself.
2. **Route first.** If the request leans toward one of the seven `realistic-image-styles` looks (skate/fisheye, phone snapshot, documentary, motion-blur dump, low curbside, disposable flash, concealed telephoto), hand off to `realistic-image-styles` and use only that skill. Otherwise continue with this skill and choose your own coherent camera (the table below has extra looks).
3. Write the four paragraphs in order, **Camera, then Tone, then Lighting, then Texture**. Camera goes first: it is the sentence that changes the whole feel.
4. Return the prompt in one code block, then a brief Camera / Tone / Lighting / Texture breakdown, then a settings line outside the prompt. Generate on Higgsfield only if asked (quote credits first).

## Structure (four short paragraphs, no headings inside the prompt)

1. **Camera** - photographic style, lens, shot size, viewpoint, framing. Keep choices coherent (e.g. "Candid 35mm film photograph with a 12mm fisheye lens, slightly elevated side view, wide full-body framing, tilted horizon and slight motion blur").
2. **Tone** - mood, atmosphere and emotional energy first; then subject, action and setting, all in this same paragraph (no separate Scene paragraph).
3. **Lighting** - source, direction and quality, and how it falls on subject and surroundings (e.g. "Harsh direct on-camera flash lights the subject, casting hard shadows while the background falls into darkness").
4. **Texture** - physical details and materials and how they interact with the environment; two or three visible qualities that support realism (grain, fur, rough asphalt, creased denim, JPEG artifacts).

## Rules

- Preserve the user's idea. Add only what helps the image; do not invent extra subjects, props or backstories.
- Use grain, flash, motion blur or imperfect framing only when they suit the scene and camera style.
- No generic quality claims ("masterpiece", "8K").
- No reference tags unless the user supplied references. If they did, keep their real labels (`@image1`, `@image2`) and state what each contributes (identity, outfit, design, scene), plus what NOT to copy (e.g. "copy none of its background").
- Spell out anatomy or counts when a reference could be misread ("exactly two arms and two legs", "outdoors on the public pavement").

## Camera looks that work (pick one, put it in the Camera paragraph)

| Look | Camera wording to use |
|---|---|
| Skate / fisheye flash | Raw 35mm skate photography, 12mm fisheye, very close low angle, curved edges, crooked horizon; harsh direct flash, film grain |
| Disposable flash | Harsh disposable-camera direct-flash snapshot (also works as a short re-photograph prompt: "Rephotograph the scene and pose in @Image 2 as ... ") |
| Low-quality camcorder | Ungraded paused frame from a cheap handheld camcorder, low crooked wide shot, deep focus, poor dynamic range, blocky low-bitrate compression (generate at the lowest resolution on purpose; the compression is the point) |
| Old iPhone selfie | Real front-camera phone image, ultra-wide 14mm with barrel distortion, arm's-length high angle, smudged lens, sensor noise, HDR processing, 9:16 |

Reuse a look: if the user likes a result, offer to save its camera style as a reusable `.md` in `templates/` so future ideas inherit it.

## Contrast ladder (for ideas that feel flat)

Level 0 expected -> Level 1 add a small situation -> Level 2 give personality -> Level 3 put it in an unexpected contrasting setting (hard metal vs soft flowers). Suggest one level up only when the user asks for ideas.

## Settings line

`{model} · {resolution} · {aspect} · refs: {list or none}`. Models used in the source: Nano Banana Pro (with a character sheet as `@image1`), Flux 2.0 Pro (2K, 4:3), Cinema Studio Image 2.5 (4K, 16:9 or 9:16). Check availability with the Higgsfield connector before promising a model.

## Output template

```
{Camera paragraph}

{Tone paragraph: mood, then subject, action, setting}

{Lighting paragraph}

{Texture paragraph}
```

Breakdown: Camera / Tone / Lighting / Texture, one line each.

## Example (format only; do not reuse content)

```
Candid 35mm film photograph with a 12mm fisheye lens, slightly elevated side view, wide full-body framing, tilted horizon and slight motion blur.

Frantic, absurd and darkly comic, like an unexpected chase caught by a passerby. A skeleton wearing a dress made of raw meat sprints down a Los Angeles street at night, with three dogs chasing close behind the skeleton.

Harsh direct on-camera flash lights the skeleton and nearby dogs, casting hard shadows across the asphalt while the parked cars and street behind them fall into darkness.

Matte ivory bones, glossy marbled meat with visible fat and uneven edges flapping with each stride, coarse dog fur, rough asphalt and visible film grain.
```

## Video start frames

For an image that will seed a Seedance video, keep the same Camera/Lighting look you want in the clip, and hand the video wording to `seedance-2-5-prompter` (with `camera-movement` for handheld behavior).
