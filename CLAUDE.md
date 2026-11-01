# VideoProduction

Two categories. Pick by the request:
- **Category 1, AI-generated:** prompt skills in `.claude/skills/` (image prompts, Seedance video prompts). Text only.
- **Category 2, code-rendered:** everything in `code-video/`. Its rules are in `code-video/CLAUDE.md`, its workflow is the `code-video` skill, and its commands run from `code-video/`. Keep its files inside that folder.

## Final outputs go to `assets/` (both categories, no exceptions)
Every finished deliverable is saved in `assets/` at this repo root, under its type and project:
`assets/<type>/<project-name>/<file>`, e.g. `assets/videos/spring-launch/final_1920x1080.mp4`.
- `videos/`: final videos, plus their captions (`.srt`).
- `images/`: final stills, generated images, thumbnails, character and reference sheets.
- `audio/`: final mixes and the chosen voice take.
- `prompts/`: final, ready-to-paste prompts as `.md` (Category 1).
- Drafts, takes and review sheets stay where they were made (`code-video/projects/<name>/out/`). Only the approved final is copied to `assets/`.
- Project names are kebab-case and match the `code-video/projects/<name>` folder when there is one.
- A new kind of output gets a new plainly named type folder; add it to `assets/README.md`.
- End by giving the user the full `assets/...` path of every file delivered.
