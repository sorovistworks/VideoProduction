# assets

Every final output from this repo lands here, sorted by type, then by project:

```
assets/
  videos/<project>/    final videos (+ captions .srt)
  images/<project>/    final stills, generated images, thumbnails, character sheets
  audio/<project>/     final mixes, chosen voice takes
  prompts/<project>/   final ready-to-paste prompts (.md)
```

Shared references for a series (character sheets) sit directly in `images/<project>/`. Pictures used in one reel (start frames, scenes) go straight into `images/<project>/<reel>/`, e.g. `images/my-series/reel-01/01-base-wide.png`. They are kept only here, with no copies under `code-video/`. Finished clips for a reel (picture + final voice) go the same way into `videos/<project>/<reel>/clips/`, e.g. `videos/my-series/reel-01/clips/s01.mp4`; raw model output and audio stems stay in `code-video/`.

Other drafts and work in progress stay in `code-video/projects/<name>/out/`. Only approved finals are copied here.
Media files are git-ignored (too large for the repo); this README and the prompt `.md` files are committed.
