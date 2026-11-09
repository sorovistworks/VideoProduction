"""Word timings for a voice take or a talking clip: uv run tools/words.py audio/voice.mp3 [model] -o docs/timing.json
Every scene, word pop-in and SFX cue reads this one file. Re-run after every new take.
Model defaults to small.en (downloads once, ~500 MB); use base.en for speed or medium.en for accuracy.
Each start is moved to where the audio gets loud (faster-whisper starts words ~0.1 s early).
Prints the words on one line, doubtful ones marked `word(?)`: check them (and brand names) before going on.
A corrected word keeps the times of the word it replaces. Self-check: uv run tools/words.py --test"""
import json
import os
import subprocess
import sys

import numpy as np

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
SR, HOP = 16000, 0.01


def decode(path):
    """Any audio or video file -> 16 kHz mono float array (faster-whisper crashes on paths with newer PyAV)."""
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(pcm, np.int16).astype(np.float32) / 32768


def snap(words, audio):
    """Move each start later to the first 10 ms where the level rises a quarter of the way to the word's peak.
    Only where there is a clear rise (a word out of a pause); words in connected speech keep their time."""
    n = int(SR * HOP)
    env = np.sqrt((audio[:len(audio) // n * n].reshape(-1, n) ** 2).mean(axis=1))
    out = []
    for w in words:
        a = int(w["start"] / HOP)
        hi = min(len(env), int(min(w["start"] + 0.25, w["end"] - 0.02) / HOP) + 1)
        start = w["start"]
        if a < hi - 1:
            floor, peak = env[max(0, a - 15):a + 1].min(), env[a:hi].max()
            thr = floor + 0.25 * (peak - floor)
            if peak > 2 * floor + 1e-4 and env[a] < thr:
                start = round((a + int(np.argmax(env[a:hi] >= thr))) * HOP, 3)
        if out:
            start = max(start, out[-1]["start"] + HOP)
        out.append({**w, "start": start})
    return out


if __name__ == "__main__":
    args = sys.argv[1:]
    if args == ["--test"]:
        audio = np.zeros(SR * 3, np.float32)
        audio[int(1.1 * SR):int(1.5 * SR)] = 0.3 * np.sin(np.arange(int(0.4 * SR)) * 0.2)
        audio[int(1.5 * SR):int(2.0 * SR)] = 0.3 * np.sin(np.arange(int(0.5 * SR)) * 0.3)
        s = snap([{"w": "hi", "start": 1.0, "end": 1.5}, {"w": "there", "start": 1.5, "end": 2.0}], audio)
        assert abs(s[0]["start"] - 1.1) <= 0.011, s   # early start moved onto the rise
        assert s[1]["start"] == 1.5, s                # connected speech: unchanged
        print("words.py ok")
        sys.exit()
    out = args.pop(args.index("-o") + 1) if "-o" in args else None  # -o writes UTF-8 itself; shell redirects can re-encode
    args = [a for a in args if a != "-o"]

    from faster_whisper import WhisperModel
    audio = decode(args[0])
    model = WhisperModel(args[1] if len(args) > 1 else "small.en", device="cpu", compute_type="int8")
    # No initial_prompt: a prompt can make it drop words.
    segments, info = model.transcribe(audio, word_timestamps=True, vad_filter=False)
    words = [
        {"w": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3), "p": round(w.probability, 2)}
        for seg in segments for w in seg.words
    ]
    words = snap(words, audio)
    text = json.dumps({"duration": round(info.duration, 3), "words": words}, indent=1)
    if out:
        open(out, "w", encoding="utf-8").write(text)
    else:
        print(text)
    print(" ".join(f"{i}:{w['w']}" + ("(?)" if w["p"] < 0.5 else "") for i, w in enumerate(words)), file=sys.stderr)
