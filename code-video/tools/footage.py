"""Prep a talking clip for a captions reel (frames, voice, cut-out, head line):

    uv run tools/footage.py <clip.mp4> projects/<name> [--from 2.4 | --no-cutout] [--clean]

Writes into the project:
  assets/frames/f00000.jpg ...  every frame, converted with the clip's own colour matrix and range (HDR is tone-mapped)
  assets/matte/f00000.png ...   me cut out (RGBA, soft alpha edge kept), from --from seconds to the end
  audio/voice.wav               the clip's own audio, 48 kHz mono (--clean: high-pass, denoise, gentle compression,
                                untouched copy kept as voice_raw.wav)
  docs/footage.json             fps, size, frame count, colour tags, first matted frame, top of head per matted frame
Next: uv run tools/words.py projects/<name>/audio/voice.wav -o projects/<name>/docs/timing.json
Cut-out: rembg + birefnet-portrait on CPU, a few seconds a frame. The model (~1 GB) downloads once into
code-video/.models/. The time per frame is printed after the first one. Re-running skips frames already
matted, so a stopped run resumes. --from 0 when the room is swapped (captions.json "room"): every frame needs me.
Self-check: uv run tools/footage.py --test
"""
import json
import os
import subprocess
import sys
import time
from fractions import Fraction
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("U2NET_HOME", str(ROOT / ".models"))  # keep the model inside code-video/
HDR = {"arib-std-b67", "smpte2084"}
MATRIX = {"bt709": "bt709", "bt470bg": "bt601", "smpte170m": "bt601", "bt2020nc": "bt2020", "bt2020c": "bt2020"}


def probe(clip):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=avg_frame_rate,r_frame_rate,height,color_space,color_transfer,color_primaries,color_range",
                          "-of", "json", str(clip)], capture_output=True, text=True, check=True).stdout
    return json.loads(out)["streams"][0]


def colour_filter(s):
    """ffmpeg -vf that turns the clip's pixels into JPEG's BT.601 full range without shifting colours."""
    if s.get("color_transfer") in HDR:  # phone HDR: tone-map to SDR BT.709 first
        tm = ("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,"
              "zscale=t=bt709:m=bt709:r=tv,format=yuv420p,")
        return tm + "scale=in_color_matrix=bt709:in_range=tv:out_color_matrix=bt601:out_range=pc,format=yuvj420p"
    m = MATRIX.get(s.get("color_space"), "bt709" if int(s.get("height", 1080)) >= 720 else "bt601")
    rng = "pc" if s.get("color_range") == "pc" else "tv"
    return f"scale=in_color_matrix={m}:in_range={rng}:out_color_matrix=bt601:out_range=pc,format=yuvj420p"


def fps_of(s):
    """Average rate (phones record variable rate; frames are resampled to this constant one)."""
    rate = s.get("avg_frame_rate", "0/0")
    rate = rate if rate != "0/0" else s["r_frame_rate"]
    return float(Fraction(rate))


def head_top(alpha):
    """Top row of me in the middle 40% of the frame (a raised hand at the side doesn't count), as a 0-1 height."""
    h, w = alpha.shape
    rows = np.nonzero((alpha[:, int(w * 0.3):int(w * 0.7)] > 128).any(axis=1))[0]
    return round(float(rows[0]) / h, 4) if len(rows) else None


def ff(*args):
    subprocess.run(["ffmpeg", "-y", "-v", "error", *args], check=True)


def main(clip, proj, start, clean):
    from PIL import Image
    frames_dir, matte_dir = proj / "assets/frames", proj / "assets/matte"
    for d in (frames_dir, matte_dir, proj / "audio", proj / "docs"):
        d.mkdir(parents=True, exist_ok=True)
    s = probe(clip)
    fps = fps_of(s)
    if not (frames_dir / "f00000.jpg").exists():
        ff("-i", str(clip), "-vf", f"fps={fps},{colour_filter(s)}", "-q:v", "2", "-start_number", "0",
           str(frames_dir / "f%05d.jpg"))
    frames = sorted(frames_dir.glob("f*.jpg"))
    w, h = Image.open(frames[0]).size  # after ffmpeg's auto-rotate, so phone clips come out upright

    raw = proj / "audio" / ("voice_raw.wav" if clean else "voice.wav")
    ff("-i", str(clip), "-vn", "-ac", "1", "-ar", "48000", str(raw))
    if clean:  # local stand-in for Adobe Podcast Enhance; for that, upload voice_raw.wav and save its result as voice.wav
        ff("-i", str(raw), "-af", "highpass=f=80,afftdn=nr=10:nf=-40:tn=1,"
           "acompressor=threshold=-21dB:ratio=3:attack=5:release=120:makeup=2", str(proj / "audio/voice.wav"))

    first = len(frames) if start == float("inf") else min(len(frames), round(start * fps))
    todo = frames[first:]
    print(f"{len(frames)} frames at {fps:.3f} fps, {w}x{h}. Cutting out {len(todo)} frames from {first / fps:.2f}s.")
    if todo:
        from rembg import new_session, remove
        if not list(Path(os.environ["U2NET_HOME"]).glob("birefnet-portrait*")):
            print("Downloading the cut-out model once (~1 GB) into code-video/.models/ ...", flush=True)
        session = new_session("birefnet-portrait")
    heads, timed = [], False
    for k, f in enumerate(todo):
        out = matte_dir / (f.stem + ".png")
        if out.exists():
            alpha = np.asarray(Image.open(out))[:, :, 3]
        else:
            t0 = time.time()
            img = Image.open(f).convert("RGB")
            mask = remove(img, session=session, only_mask=True)  # soft edge kept: no post-process, no threshold
            img.putalpha(mask)
            img.save(out)
            alpha = np.asarray(mask)
            if not timed:
                per, timed = time.time() - t0, True
                print(f"~{per:.1f} s a frame, about {per * (len(todo) - k) / 60:.0f} min left.", flush=True)
        heads.append(head_top(alpha))
        if k % 25 == 0:
            print(f"cut out {k + 1}/{len(todo)}", flush=True)

    meta = {"fps": round(fps, 5), "width": w, "height": h, "frames": len(frames), "matteFrom": first, "head": heads,
            "colour": {k: s.get(k) for k in ("color_space", "color_transfer", "color_primaries", "color_range")}}
    (proj / "docs/footage.json").write_text(json.dumps(meta), encoding="utf-8")
    print(f"wrote {proj / 'docs/footage.json'}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args == ["--test"]:
        a = np.zeros((100, 100), np.uint8)
        a[40:, 45:55] = 255   # head in the middle from row 40
        a[10:, 0:20] = 255    # raised hand at the edge, row 10: ignored
        assert head_top(a) == 0.4, head_top(a)
        assert head_top(np.zeros((10, 10), np.uint8)) is None
        assert abs(fps_of({"avg_frame_rate": "30000/1001", "r_frame_rate": "30/1"}) - 29.97003) < 1e-4
        assert "in_color_matrix=bt709:in_range=tv" in colour_filter({"color_space": "bt709", "height": 1920})
        assert "tonemap" in colour_filter({"color_transfer": "arib-std-b67"})
        assert "in_range=pc" in colour_filter({"color_space": "smpte170m", "color_range": "pc"})
        print("footage.py ok")
    else:
        start = float(args.pop(args.index("--from") + 1)) if "--from" in args else 0.0
        start = float("inf") if "--no-cutout" in args else start  # frames + voice only, before the words are approved
        clean = "--clean" in args
        args = [a for a in args if a not in ("--from", "--clean", "--no-cutout")]
        main(Path(args[0]), Path(args[1]), start, clean)
