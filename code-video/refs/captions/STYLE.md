# Captions style

The house style for captions reels on the user's own footage (`captions-reel` skill, `templates/footage/`).
Every value here maps to a field in `docs/captions.json`. Add reels you'd steal from to this folder, then say "refresh the captions style".

## Starting look
- **Two fonts, not ten.** Inter Bold for most words (`font`, `weight`); Anton capitals for the word that matters (`bigFont`). The contrast does most of the work.
- **Colour means something.** Most words are white (`color`). The accent (`accent`) goes on at most one word a line, the one to remember (`accentWords`).
- **Big word behind the head.** ~85% of the frame width (`bigWidth`). The head overlaps ~60% of the letter height (`headOverlap`) and covers at least 15% of the letters (`minCover`). It pops 80 → 100% over 6 frames with ~5% overshoot, then holds still until the next big word.
- **Captions in front.** About 7% of the frame width (`size`), soft dark shadow (`shadow`), up to 3 words (`maxWords`), split at natural breaks, each word on its own start, a group up until the next starts. Above the big word, never on it. The big word is never captioned twice.
- **Land every word on the voice.** Starts are snapped to the waveform. Check `wave_at.png`, then watch with sound on.
- **Give it depth.** Room/frame, words behind, me, captions in front, under one camera: a push-in on every big word plus a slow drift (`push`, `drift`).
- **Every move gets a sound.** A tick for caption words, a whoosh and hit for big words. Quiet, under the voice.
- **Stay out of Instagram's way.** Text between 15% and 65% of the height (`safeTop`, `safeBottom`), at most 72% of the width (`safeWidth`), clear of the right-side buttons.

## House rules
<!-- Approved looks go here, one line each, with the reel they came from. Claude reads this before every captions reel. -->
