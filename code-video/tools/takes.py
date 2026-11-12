"""Pick the best voice take by measurement, not by ear alone.

    uv run tools/takes.py "Okay. Let's back up." audio/takes/nib_01_a.mp3 audio/takes/nib_01_b.mp3 [...] [--pace 2.6] [--model base.en]

For each take: transcribes it (faster-whisper), then measures
  match    share of the script's words that were heard (catches dropped or changed words)
  clarity  mean word confidence from the recogniser (mumbled or slurred words score low)
  pace     words per second over the spoken part, against --pace (default 2.6 w/s, natural cartoon delivery)
  air      silence before the first and after the last word (trim later; long air is fine, clipped words are not)
  clip     samples at full scale (distortion)
Ranks them (match first, then clarity, then pace) and prints the winner. Two or three takes per line is the norm.
"""
import re
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from words import decode  # noqa: E402

args = sys.argv[1:]
if len(args) < 2:
    print(__doc__)
    sys.exit(1)
opt = lambda k, d: args[args.index(k) + 1] if k in args else d
pace_target, model_name = float(opt("--pace", 2.6)), opt("--model", "base.en")
skip = {opt("--pace", None), opt("--model", None), "--pace", "--model"}
text, files = args[0], [a for a in args[1:] if a not in skip]
norm = lambda s: re.findall(r"[a-z0-9']+", s.lower())
want = norm(text)

from faster_whisper import WhisperModel  # noqa: E402

model = WhisperModel(model_name, device="cpu", compute_type="int8")
rows = []
for f in files:
    audio = decode(f)
    segs, _ = model.transcribe(audio, word_timestamps=True, vad_filter=False)
    words = [w for s in segs for w in s.words]
    heard = norm(" ".join(w.word for w in words))
    match = sum(1 for w in want if w in heard) / max(1, len(want))
    clarity = float(np.mean([w.probability for w in words])) if words else 0.0
    if words:
        span = max(0.1, words[-1].end - words[0].start)
        pace = len(words) / span
        air = (words[0].start, len(audio) / 16000 - words[-1].end)
    else:
        pace, air = 0.0, (0.0, 0.0)
    clip = int(np.sum(np.abs(audio) > 0.995))
    score = match * 10 + clarity * 3 - abs(pace - pace_target) * 0.6 - min(clip, 50) * 0.05
    rows.append((score, f, match, clarity, pace, air, clip, " ".join(heard)))
rows.sort(reverse=True)
for i, (s, f, m, c, p, air, clip, heard) in enumerate(rows):
    print(f"{'BEST ' if i == 0 else '     '}{f}\n      score {s:5.2f}  match {m:4.0%}  clarity {c:.2f}  pace {p:.2f} w/s"
          f"  air {air[0]:.2f}s/{air[1]:.2f}s  clipped {clip}\n      heard: {heard}")
