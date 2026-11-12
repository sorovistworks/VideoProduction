"""Lip sync from the voice tracks: uv run tools/lipsync.py projects/<name>/docs/voices.json -o projects/<name>/docs/lipsync.json

Reads docs/voices.json ([{ "who", "file", "at" }], paths relative to the project) and writes per-character mouth curves
on the film timeline, one [open, wide] pair per frame:
  open  0..1   loudness opens the mouth (10 ms RMS, gated, smoothed: fast open, slower close)
  wide -1..1   share of high frequencies: hissy "ee/s" sounds widen it, dark "oo/o" sounds round it
The mouth leads the sound by --lead frames (default 1), and every phrase ends shut: any pause of 0.12 s or more closes it.
The page reads it with engine/toon/lipsync.js. Flags: --fps 24 --lead 1. Self-check: --test
"""
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sound import SR, load  # noqa: E402


def curves(x, fps):
    hop = SR // 100                                       # 10 ms analysis
    n = len(x) // hop
    fr = x[:n * hop].reshape(n, hop)
    rms = np.sqrt((fr ** 2).mean(axis=1)) + 1e-9
    dbv = 20 * np.log10(rms)
    peak = np.percentile(dbv, 97)
    gate = peak - 32
    open_ = np.clip((dbv - gate) / (peak - gate), 0, 1) ** 0.8
    spec = np.abs(np.fft.rfft(fr * np.hanning(hop), axis=1)) ** 2
    f = np.fft.rfftfreq(hop, 1 / SR)
    hf = spec[:, f > 2500].sum(axis=1) / (spec.sum(axis=1) + 1e-12)
    wide = np.clip((hf - 0.12) / 0.18, -1, 1)
    # phrase ends shut: silence >= 0.12 s closes the mouth
    quiet = dbv < gate + 3
    run = 0
    for i in range(n):
        run = run + 1 if quiet[i] else 0
        if run >= 12:
            open_[i - run + 1:i + 1] = 0
    # fast open, slower close
    out, lvl = np.empty(n), 0.0
    for i, v in enumerate(open_):
        k = 0.35 if v < lvl else 0.85
        lvl = lvl + (v - lvl) * k
        out[i] = lvl
    # resample to film frames
    t10 = np.arange(n) / 100
    tf = np.arange(int(np.ceil(len(x) / SR * fps))) / fps
    o = np.interp(tf, t10, out)
    w = np.interp(tf, t10, wide) * np.clip(o * 3, 0, 1)
    o[-1:] = 0
    return o, w


if __name__ == "__main__":
    args = sys.argv[1:]
    if args == ["--test"]:
        x = np.zeros(SR * 2)
        x[int(0.5 * SR):int(1.2 * SR)] = np.sin(np.arange(int(0.7 * SR)) * 2 * np.pi * 200 / SR) * 0.3
        o, w = curves(x, 24)
        assert o[int(0.3 * 24)] < 0.05 and o[int(0.9 * 24)] > 0.6 and o[int(1.6 * 24)] < 0.05, o
        print("lipsync.py ok")
        sys.exit()
    if not args:
        print(__doc__)
        sys.exit(1)
    opt = lambda k, d: args[args.index(k) + 1] if k in args else d
    fps, lead = int(opt("--fps", 24)), int(opt("--lead", 1))
    vj = Path(args[0])
    out = Path(opt("-o", vj.parent / "lipsync.json"))
    voices = json.loads(vj.read_text(encoding="utf-8"))
    tracks = {}
    for v in voices:
        o, w = curves(load(vj.parent.parent / v["file"]), fps)
        start = round(v["at"] * fps) - lead                 # the mouth moves one frame before the sound
        tr = tracks.setdefault(v["who"], [])
        need = start + len(o)
        if len(tr) < need:
            tr.extend([[0.0, 0.0]] * (need - len(tr)))
        for i in range(len(o)):
            if start + i >= 0 and o[i] > tr[start + i][0]:
                tr[start + i] = [round(float(o[i]), 3), round(float(w[i]), 3)]
        print(f"{v['who']:10s} {v['file']}  at {v['at']:.2f}s  {len(o)} frames, peak open {o.max():.2f}")
    out.write_text(json.dumps({"fps": fps, "lead": lead, "tracks": tracks}), encoding="utf-8")
    print(out)
