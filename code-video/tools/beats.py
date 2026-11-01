"""Beat grid for a music track: uv run tools/beats.py song.wav -o docs/beats.json
Screen changes on beats, big moments on downbeats, SFX on hits."""
import json
import sys

import librosa
import numpy as np

args = sys.argv[1:]
out = args.pop(args.index("-o") + 1) if "-o" in args else None
args = [a for a in args if a != "-o"]

y, sr = librosa.load(args[0], sr=None, mono=True)
tempo, frames = librosa.beat.beat_track(y=y, sr=sr, units="frames")
beats = librosa.frames_to_time(frames, sr=sr).round(3).tolist()

onset = librosa.onset.onset_strength(y=y, sr=sr)
peaks = librosa.util.peak_pick(onset, pre_max=3, post_max=3, pre_avg=3, post_avg=5, delta=0.5, wait=10)
text = json.dumps({
    "bpm": float(np.atleast_1d(tempo)[0]),
    "beats": beats,
    "downbeats": beats[::4],
    "hits": librosa.frames_to_time(peaks, sr=sr).round(3).tolist(),
}, indent=1)
if out:
    open(out, "w", encoding="utf-8").write(text)
else:
    print(text)
