# refs

Your reference library, one folder per genre. Drop clips, screenshots or mood-board images into the folder that fits:

| Folder | For |
|---|---|
| `ads/` | product launches, spec ads, app promos |
| `explainers/` | how-it-works, data stories, maths and science |
| `stories/` | kids' stories, illustrated and narrative films |
| `kinetic-type/` | typography-led edits, quotes, lyric videos |
| `3d/` | product shots, 3D scenes, maquettes |
| `social/` | Reels / Shorts / TikTok hooks, pacing and formats |
| `captions/` | caption reels you'd steal from: fonts, sizes, how words enter and leave, depth; `STYLE.md` holds the house rules |

Add any folder you like (`music-videos/`, `brand-x/` ...). A brand you work for repeatedly deserves its own folder.

## How it works
- **STYLE.md per folder.** The first time a genre is used, Claude studies every file in that folder and writes `STYLE.md`: palette (hex), type, shot lengths, transitions, camera moves, texture, how text enters and exits, sound feel, and what to avoid. Later videos in that genre start from it. Edit it by hand any time; it is your house style for that genre.
- **Add references → refresh.** After adding files, say "refresh the ads style" and Claude re-studies the folder.
- **Mix references in one brief.** Name what to take from each:
  `Type and colour from refs/kinetic-type/neon-quotes.mp4, camera moves from refs/3d/orbit-shot.mp4, pacing from refs/social/`
- **Grammar, never content.** Claude copies pacing, type, colour, transitions and camera, never the logos, characters or footage.

Only README and STYLE.md files are committed to git. Reference media stays local (large, and usually someone else's work).
