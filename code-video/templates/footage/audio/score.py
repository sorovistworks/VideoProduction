"""Sound for a captions reel: every move gets a sound, quiet and under the voice.
Run from code-video/: uv run projects/<name>/audio/score.py  ->  audio/mix.wav, then node tools/finish.mjs projects/<name>
Cues come from the same files the picture reads (docs/timing.json + docs/captions.json), so each lands on its frame."""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[2] / "tools"))
from sound import *  # noqa: E402,F403

P = HERE.parent
words = json.load(open(P / "docs/timing.json", encoding="utf-8-sig"))["words"]
cfg = json.load(open(P / "docs/captions.json", encoding="utf-8-sig"))
big = {b if isinstance(b, int) else b["i"] for b in cfg.get("behind", [])}

voice = load(HERE / "voice.wav")
sfx = silence(len(voice) / SR + 1)
for i, w in enumerate(words):
    if i in big:  # the big word slams in and the camera pushes: whoosh peaking on the word, hit on it
        place(sfx, whoosh(0.35), max(0.0, w["start"] - 0.35), -18)
        place(sfx, hit(0.7), w["start"], -16)
    else:         # each caption word popping in: a light tick
        place(sfx, tick(), w["start"], -28)
# Your own sound library: place(sfx, load("D:/sfx/pop.wav"), t, -20) on the frame where that thing happens on screen.
# Music (licensed or synthesized): music = load(...) or built with beat_times(); then mix(duck(music, voice), sfx, voice).
write(HERE / "mix.wav", mix(sfx, voice))
print(HERE / "mix.wav")
