"""Animation checker sheets: frame-by-frame review of a rendered film, shot by shot.

    uv run tools/anim_review.py projects/<name>/out/draft_1920x1080.mp4 [--shots s03,s04] [--fps 12]
        [--at 6.25 --crop 700,600,500,400 [--n 10]] [--pop 3.0]

Reads the cut list from projects/<name>/docs/cutlist.json (written by engine/render-film.mjs), else detects cuts.
Writes into projects/<name>/out/review/ and prints every file:
  sheet_<shot>_NN.png   contact sheets at --fps (default 12) with burned-in frame number, time and shot id
  cuts.png              every cut: the last frame before it and the first three after it (ghosts, pops, wrong poses)
  closeup_<t>.png       --at/--crop: N consecutive full-resolution frames of one region (feet on the ground,
                        hands on props, bodies against the set)
  pops.txt              the pop metric: frames that jump away from BOTH neighbours while the neighbours agree
                        (one-frame pops), cuts excluded, worst first
Split a long film between several checkers with --shots (each checker gets a third of the film).
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

args = sys.argv[1:]
if not args:
    print(__doc__)
    sys.exit(1)
video = Path(args[0])
opt = lambda k, d=None: args[args.index(k) + 1] if k in args else d
SHEET_FPS = float(opt("--fps", 12))
POP_K = float(opt("--pop", 3.0))
proj = video.parent.parent
out = video.parent / "review"
out.mkdir(parents=True, exist_ok=True)

probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate,width,height",
                        "-of", "json", str(video)], capture_output=True, text=True).stdout
st = json.loads(probe)["streams"][0]
num, den = (int(x) for x in st["r_frame_rate"].split("/"))
FPS, VW, VH = num / den, st["width"], st["height"]

try:
    FONT = ImageFont.truetype("arial.ttf", 18)
    FONT_S = ImageFont.truetype("arial.ttf", 14)
except OSError:
    FONT = FONT_S = ImageFont.load_default()


def label(img, text, font=FONT):
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = d.textbbox((6, 4), text, font=font)
    d.rectangle((x0 - 4, y0 - 3, x1 + 4, y1 + 3), fill=(0, 0, 0))
    d.text((6, 4), text, fill=(255, 235, 120), font=font)
    return img


def frames(scale_w, every=1, start=0.0, dur=None, crop=None):
    """Stream frames as (index, RGB array). crop = (x, y, w, h) in source pixels."""
    vf = []
    if crop:
        vf.append(f"crop={crop[2]}:{crop[3]}:{crop[0]}:{crop[1]}")
        w, h = crop[2], crop[3]
    else:
        w, h = VW, VH
    if scale_w and scale_w != w:
        h = round(h * scale_w / w / 2) * 2
        w = scale_w
        vf.append(f"scale={w}:{h}")
    cmd = ["ffmpeg", "-v", "error"]
    if start:
        cmd += ["-ss", f"{start:.4f}"]
    cmd += ["-i", str(video)]
    if dur:
        cmd += ["-t", f"{dur:.4f}"]
    cmd += (["-vf", ",".join(vf)] if vf else []) + ["-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    i, n = 0, w * h * 3
    first = round(start * FPS)
    while True:
        buf = p.stdout.read(n)
        if len(buf) < n:
            break
        if i % every == 0:
            yield first + i, np.frombuffer(buf, np.uint8).reshape(h, w, 3)
        i += 1
    p.wait()


# ---------- cuts ----------
cut_file = proj / "docs" / "cutlist.json"
if cut_file.exists():
    cl = json.loads(cut_file.read_text(encoding="utf-8"))
    shots = [(c["id"], round(c["start"] * FPS), round(c["end"] * FPS)) for c in cl["cuts"]]
else:
    print("no docs/cutlist.json: detecting cuts")
    txt = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(video), "-vf", "select='gt(scene,0.3)',showinfo", "-an", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [0] + [round(float(x.split("pts_time:")[1].split()[0]) * FPS) for x in txt.splitlines() if "pts_time:" in x]
    total = int(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries",
                                "stream=nb_read_frames", "-of", "csv=p=0", str(video)], capture_output=True, text=True).stdout)
    shots = [(f"s{i + 1:02d}", a, (starts + [total])[i + 1]) for i, a in enumerate(starts)]
want = opt("--shots")
if want:
    keep = set(want.split(","))
    shots = [s for s in shots if s[0] in keep]
cut_frames = {a for _, a, _ in shots}
shot_of = lambda f: next((s for s, a, b in shots if a <= f < b), "?")
written = []

# ---------- pass 1: small grey frames for the pop metric + sheet tiles ----------
step = max(1, round(FPS / SHEET_FPS))
TW, COLS, ROWS = 320, 6, 5
grey, sheets = [], {}
for f, img in frames(TW):
    if shot_of(f) == "?":
        continue
    g = img[::2, ::2].mean(axis=2).astype(np.float32)
    grey.append((f, g))
    if f % step == 0:
        sheets.setdefault(shot_of(f), []).append(label(Image.fromarray(img.copy()), f"{shot_of(f)}  f{f}  {f / FPS:6.3f}s", FONT_S))

for sid, tiles in sheets.items():
    per = COLS * ROWS
    for k in range(0, len(tiles), per):
        part = tiles[k:k + per]
        th = part[0].height
        sheet = Image.new("RGB", (COLS * TW + (COLS - 1) * 4, ((len(part) + COLS - 1) // COLS) * (th + 4) - 4), (20, 20, 20))
        for i, t in enumerate(part):
            sheet.paste(t, ((i % COLS) * (TW + 4), (i // COLS) * (th + 4)))
        p = out / f"sheet_{sid}_{k // per + 1:02d}.png"
        sheet.save(p)
        written.append(p)

# ---------- pop metric ----------
pops = []
idx = [f for f, _ in grey]
G = [g for _, g in grey]
for i in range(1, len(G) - 1):
    f = idx[i]
    if f in cut_frames or idx[i + 1] in cut_frames or idx[i] - idx[i - 1] != 1 or idx[i + 1] - idx[i] != 1:
        continue
    a = np.abs(G[i] - G[i - 1]).mean()
    b = np.abs(G[i + 1] - G[i]).mean()
    across = np.abs(G[i + 1] - G[i - 1]).mean()
    # a frame that jumps away from both neighbours while the neighbours agree with each other
    score = min(a, b) / (across + 0.5)
    if score > POP_K and min(a, b) > 1.0:
        pops.append((score, f, a, b, across))
pops.sort(reverse=True)
lines = [f"f{f:5d} {f / FPS:7.3f}s  {shot_of(f):6s} pop {s:5.1f}  (in {a:.1f}, out {b:.1f}, across {c:.1f})" for s, f, a, b, c in pops]
(out / "pops.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
written.append(out / "pops.txt")

# ---------- cuts: last frame before + first three after ----------
rows = []
for sid, a, _ in shots:
    if a == 0:
        continue
    t0 = max(0, (a - 1) / FPS)
    got = [label(Image.fromarray(im.copy()), f"{'before' if f < a else shot_of(f)} f{f}", FONT_S) for f, im in frames(TW, start=t0, dur=4.5 / FPS)][:4]
    if got:
        row = Image.new("RGB", (len(got) * (TW + 4) - 4, got[0].height), (20, 20, 20))
        for i, t in enumerate(got):
            row.paste(t, (i * (TW + 4), 0))
        rows.append(row)
if rows:
    sheet = Image.new("RGB", (max(r.width for r in rows), sum(r.height + 6 for r in rows)), (20, 20, 20))
    y = 0
    for r in rows:
        sheet.paste(r, (0, y))
        y += r.height + 6
    sheet.save(out / "cuts.png")
    written.append(out / "cuts.png")

# ---------- contact close-up strip ----------
if "--at" in args:
    at = float(opt("--at"))
    crop = tuple(int(v) for v in opt("--crop", f"0,0,{VW},{VH}").split(","))
    n = int(opt("--n", 10))
    cw = min(480, crop[2])
    got = [label(Image.fromarray(im.copy()), f"f{f} {f / FPS:.3f}s", FONT_S) for f, im in frames(cw, start=at, dur=(n + 0.5) / FPS, crop=crop)][:n]
    cols = min(5, len(got))
    strip = Image.new("RGB", (cols * (cw + 4) - 4, ((len(got) + cols - 1) // cols) * (got[0].height + 4) - 4), (20, 20, 20))
    for i, t in enumerate(got):
        strip.paste(t, ((i % cols) * (cw + 4), (i // cols) * (got[0].height + 4)))
    p = out / f"closeup_{at:.2f}.png"
    strip.save(p)
    written.append(p)

for p in written:
    print(p)
print(f"\n{len(pops)} pop(s) above {POP_K}" + (":\n" + "\n".join(lines[:15]) if pops else ""))
