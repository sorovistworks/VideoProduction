"""Cue sheet: every hit is placed on a frame, written down, and its real onset measured afterwards.

In a project's audio/score.py:
    from cues import CueSheet, place_voices
    cs = CueSheet(fps=24)
    cs.place(sfx, hit(), frame=104, name="sneeze")          # or seconds=4.33
    voice = place_voices(silence(DUR), HERE.parent / "docs" / "voices.json")
    cs.save(HERE.parent / "docs" / "cues.json")
    write(HERE / "sfx.wav", sfx)                            # a stem makes the onset check exact

Check (from code-video/):
    uv run tools/cues.py projects/<name>/audio/sfx.wav projects/<name>/docs/cues.json [--tol 1]
Prints each cue: planned frame, measured onset, error in ms and frames. Exits 1 if any cue is off by more than
--tol frames (default 1). Run it on the sfx stem (exact) or the mix (works when hits stand out).

docs/voices.json (one entry per line, also read by tools/lipsync.py and the page):
    [{ "who": "nib", "file": "audio/lines/nib_01.wav", "at": 10.25, "text": "Okay. Let's back up." }, ...]
"""
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sound import SR, load, place  # noqa: E402


class CueSheet:
    def __init__(self, fps=24):
        self.fps, self.cues = fps, []

    def place(self, track, clip, frame=None, seconds=None, name="", gain_db=0.0, onset=0.0, swell=False):
        """Place clip so its onset (`onset` s into the clip) lands on `frame` (or `seconds`). Records the cue.
        swell=True for sounds that fade in (breaths, whooshes, risers): listed, but no sharp onset to measure."""
        t = frame / self.fps if frame is not None else seconds
        place(track, clip, t - onset, gain_db)
        self.cues.append({"name": name, "frame": round(t * self.fps), "t": round(t, 4), "swell": swell})
        return track

    def save(self, path):
        Path(path).write_text(json.dumps({"fps": self.fps, "cues": self.cues}, indent=1), encoding="utf-8")


def place_voices(track, voices_json, gain_db=0.0):
    """Place every voice line from docs/voices.json (paths relative to the project folder)."""
    vj = Path(voices_json)
    for v in json.loads(vj.read_text(encoding="utf-8")):
        place(track, load(vj.parent.parent / v["file"]), v["at"], gain_db + v.get("gain_db", 0.0))
    return track


def onsets(x, t, win=(-0.08, 0.12)):
    """Measured onset near t: the first 1 ms frame where the envelope rises past 30% of the local peak."""
    a, b = max(0, int((t + win[0]) * SR)), min(len(x), int((t + win[1]) * SR))
    seg = np.abs(x[a:b])
    if len(seg) < 48 or seg.max() < 1e-4:
        return None
    n = SR // 1000
    env = seg[:len(seg) // n * n].reshape(-1, n).max(axis=1)
    floor = np.percentile(env[:max(3, len(env) // 6)], 50)
    thr = floor + 0.3 * (env.max() - floor)
    i = int(np.argmax(env >= thr))
    return (a + i * n) / SR


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)
    tol = float(args[args.index("--tol") + 1]) if "--tol" in args else 1.0
    audio = load(args[0])
    sheet = json.loads(Path(args[1]).read_text(encoding="utf-8"))
    fps, bad = sheet["fps"], 0
    print(f"{'cue':24s} {'frame':>6s} {'planned':>8s} {'measured':>9s} {'error':>8s}")
    for c in sheet["cues"]:
        if c.get("swell"):
            print(f"{c['name'][:24]:24s} {c['frame']:6d} {c['t']:8.3f}   (swell: placed, not onset-checked)")
            continue
        m = onsets(audio, c["t"])
        if m is None:
            print(f"{c['name'][:24]:24s} {c['frame']:6d} {c['t']:8.3f}   (silent)  CHECK")
            bad += 1
            continue
        err = m - c["t"]
        off = abs(err) * fps > tol
        bad += off
        print(f"{c['name'][:24]:24s} {c['frame']:6d} {c['t']:8.3f} {m:9.3f} {err * 1000:+7.1f}ms" + ("  OFF" if off else ""))
    hits = [c for c in sheet["cues"] if not c.get("swell")]
    print(f"\n{len(hits) - bad}/{len(hits)} hits within {tol:g} frame(s)")
    sys.exit(1 if bad else 0)
