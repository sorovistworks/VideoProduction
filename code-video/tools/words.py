"""Word timings for a voice take: uv run tools/words.py audio/voice.mp3 [model] -o docs/timing.json
Every scene, word pop-in and SFX cue reads this one file. Re-run after every new take.
Model defaults to small.en (downloads once, ~500 MB); use base.en for speed or medium.en for accuracy."""
import json
import os
import sys

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

import librosa
from faster_whisper import WhisperModel

args = sys.argv[1:]
out = args.pop(args.index("-o") + 1) if "-o" in args else None  # -o writes UTF-8 itself; shell redirects can re-encode
args = [a for a in args if a != "-o"]

# Decode with librosa: faster-whisper's own PyAV decoder breaks on newer av releases.
audio, _ = librosa.load(args[0], sr=16000, mono=True)
model = WhisperModel(args[1] if len(args) > 1 else "small.en", device="cpu", compute_type="int8")
segments, info = model.transcribe(audio, word_timestamps=True, vad_filter=False)
words = [
    {"w": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)}
    for seg in segments for w in seg.words
]
text = json.dumps({"duration": round(info.duration, 3), "words": words}, indent=1)
if out:
    open(out, "w", encoding="utf-8").write(text)
else:
    print(text)
