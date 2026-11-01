# VideoProduction

Two ways to make a video, kept separate.

## Category 1: AI-generated (prompts)
Skills in `.claude/skills/` write ready-to-paste prompts for Higgsfield image and video models. They write text only; the models render.
- `realistic-image-prompter`, `realistic-image-styles`: photo-like stills (CTLT: Camera, Tone, Lighting, Texture).
- `seedance-2-5-prompter`, `camera-movement`: Seedance 2.5 video shots.

## Category 2: code-rendered (`code-video/`)
Every frame is drawn by code (canvas/SVG/three.js page with `window.seek(t)`), captured with Playwright, encoded with ffmpeg. Music and SFX are synthesized in Python, the voice comes from ElevenLabs, and the result is mastered to −14 LUFS.
- Rules, commands and routes: [code-video/CLAUDE.md](code-video/CLAUDE.md). Workflow: the `code-video` skill.
- Setup: `cd code-video`, `npm install`, `uv sync`, ffmpeg on PATH.
- Start a video: ask Claude for a code-rendered video (the `code-video` skill), or begin from `code-video/templates/`.
