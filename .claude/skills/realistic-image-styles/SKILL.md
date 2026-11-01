---
name: realistic-image-styles
description: Library of seven realistic capture styles (close skate-camera, phone snapshot, intimate documentary, motion-blurred photo dump, low curbside, disposable camera, concealed observation) with ready CTLT sentences for each. Use when the user wants image ideas, asks "what style / camera look", wants the same scene in several looks, or needs a text-only realistic image prompt with no reference image. Use this skill alone when the request leans toward one of the seven looks; for anything else use realistic-image-prompter.
---

# Realistic image styles (seven ways to capture an idea)

Source: "Seven Ways to Capture an Idea | Realistic Image Styles" (Docs/ folder). Same scene, seven cameras: the style is carried by the **Camera** sentence plus matching Lighting and Texture. Subject, action and setting stay yours. No character sheet or reference image is required (the source demos used Nano Banana Pro with a costume reference; text-only results will differ).

## Workflow

1. Get the user's subject + action + setting. Keep it verbatim; it goes in the Tone paragraph.
2. Pick **one** style from the library (user's choice, or the best fit; for "give me ideas", offer 3 to 7 styles over the same scene).
3. Join the four rows in order: Camera, Tone, Lighting, Texture, as four short paragraphs with no headings, in one code block. Follow it with a one-line-each Camera / Tone / Lighting / Texture breakdown and a settings line (`{model} · {resolution} · {aspect} · refs: none`). This skill is self-contained; do not also load `realistic-image-prompter`.
4. Rules: keep the user's idea, add no extra subjects or props, no generic quality words ("masterpiece", "8K"), and no reference tags unless the user supplied references (then keep their real labels and say what each contributes).
5. Never stack incompatible camera instructions (e.g. fisheye + telephoto, flash + available-light only).
6. Phrases are directions, not exact camera settings. After generating, check that viewpoint, framing, texture or blur actually changed; if not, strengthen the Camera sentence.

## Copyable structure

```
Camera: [Photographic style + lens, if useful + viewpoint + framing.]
Tone: [Mood + atmosphere. Subject + action + setting.]
Lighting: [Light source + direction + quality + effect on subject and background.]
Texture: [Materials + visible surface details + interaction with movement or environment + grain or noise, if appropriate.]
```

For complex prompts, keep CTLT in mind but think in four layers: **overall look -> subjects -> decor -> finish**.

## Style library

Each entry: Camera / Lighting / Texture wording. `{subject}` = the user's Tone paragraph with an emotional lead-in matching the "Tone" cue.

### 1. Close skate-camera
- **Tone cue:** raw, spontaneous, slightly absurd.
- **Camera:** Candid film photography shot close to the subject from knee height with a 12mm fisheye lens, wide framing, curved edges and a crooked horizon.
- **Lighting:** Harsh direct on-camera flash lights the subject and nearby ground, casting hard shadows behind it. Cool ambient light glows from any building while the street beyond stays dark.
- **Texture:** Real materials with visible fabric/foam detail, creased denim, scuffed shoes, rough pavement and noticeable film grain.

### 2. Phone snapshot
- **Set aspect ratio 9:16.**
- **Tone cue:** casual, fleeting, unposed.
- **Camera:** Quick vertical phone snapshot taken at eye level while walking past, slightly tilted and loosely framed, with a little movement blur from the photographer's motion.
- **Lighting:** Available light spills onto one side of the subject. Weak street lighting leaves uneven illumination and noisy shadows.
- **Texture:** Visible material detail, folds in clothing, and phone-camera noise in the darker areas.

### 3. Intimate documentary
- **Tone cue:** quiet, observational, unguarded.
- **Camera:** Close handheld documentary photograph on 35mm film with a 35mm lens, taken at the seated subject's eye level, waist-up framing and a slightly uneven crop.
- **Lighting:** Uneven light from the entrance falls across one side of the subject, fading into soft shadow on the other. Background dim but visible.
- **Texture:** Visible seams and fabric detail, folds around the elbows, small incidental marks (e.g. grease on a carton) and fine film grain.

### 4. Motion-blurred photo dump
- **Tone cue:** chaotic, accidental, slightly absurd.
- **Camera:** A badly shaken handheld phone snapshot with strong diagonal camera-shake blur across the whole image, doubled edges and smeared shapes. The subject remains recognizable, with blur affecting both subject and background.
- **Lighting:** Available light and weak street lighting; bright areas smear into diagonal streaks in the same direction as the shake.
- **Texture:** Materials read as soft blocks of texture, coarse digital noise in the shadows, rough ground smeared by the movement.

### 5. Low curbside
- **Tone cue:** mundane, unposed, quietly comic.
- **Camera:** Candid photograph shot from curb level with a 24mm wide-angle lens, full-body framing, shoes close to the camera, the head/upper body farther back and pavement filling the foreground.
- **Lighting:** Cool light spills from the building across the subject and curb. Weak street lighting catches the foreground pavement, deeper shadows beneath the legs.
- **Texture:** Visible material detail, denim bunching around the knees, scuffed shoes and coarse pavement close to the lens.

### 6. Disposable camera look
- **Tone cue:** candid, mundane, slightly absurd.
- **Camera:** Found footage flash photograph. Shot at night on a cheap digital point-and-shoot camera, everything mostly in focus, a quick unplanned composition and an imperfect crop.
- **Lighting:** Harsh built-in flash lights the subject from the front, casting a hard shadow behind it and clipping the brightest highlights. The background glows faintly in the dark.
- **Texture:** Visible material detail, creased denim, slightly crunchy digital detail, mild compression artifacts and noisy shadows.

### 7. Concealed observation
- **Tone cue:** quiet, distant, unposed; subject is unaware of the camera ("looking away, unaware of the camera").
- **Camera:** Telephoto photograph taken from inside a parked car, with compressed perspective and slightly soft focus. A blurred window edge and dashboard partially obscure the foreground.
- **Lighting:** Available light illuminates the subject across the street. The car interior stays dark, weak street lighting falls unevenly on the pavement.
- **Texture:** Fabric and material detail, rough pavement and visible grain, with faint reflections on the window glass.

## Library enhancement (every run, with permission)

After delivering the prompt, check whether this run taught the library something:
- the user asked for a look that fits none of the seven (candidate new style, e.g. CCTV, polaroid, drone);
- the user corrected or rewrote a Camera / Lighting / Texture sentence, or said a style "didn't change the viewpoint/blur" (candidate wording fix);
- the user reported a result they liked, which suggests a better tone cue or picker row.

If there is a candidate, show the exact proposed addition or edit (style name, the four lines, and where it goes) and **ask the user with AskUserQuestion before touching this file**: "Add to library" / "Edit first" / "Skip". Never edit this file without a yes. If nothing was learned, say nothing. New styles follow the existing entry format (Tone cue, Camera, Lighting, Texture) and get a Quick picker row. Never delete or overwrite an existing style without it being the specific thing the user asked to change.

## Quick picker

| Want | Style |
|---|---|
| Energetic, distorted, street/skate | 1 |
| Social-feed, vertical | 2 (9:16) |
| Intimate, editorial, calm | 3 |
| Messy, "accidental" | 4 |
| Ground-level, small and funny | 5 |
| Party/found-photo flash | 6 |
| Voyeuristic, distant | 7 |

## Reference scene used in the source (format only, do not reuse for the user's idea)

One person in a mascot costume with an oversized head and moustache, black T-shirt and jeans, sits on a laundromat doorstep at night holding a carton of fries, looking away from the camera.

## Related skills

- `realistic-image-prompter`: the general CTLT skill; it routes here when a request fits one of the seven looks.
- `seedance-2-5-prompter` + `camera-movement`: when the image becomes a video start frame.
