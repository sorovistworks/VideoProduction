"""Frame-level motion audit of a rendered video.

    uv run tools/motion_audit.py projects/<name>/out/draft_1920x1080.mp4 [--static 6]

Decodes every frame at 160x90 grayscale (small enough that film grain averages out) and reports:
  STATIC  stretches where nothing on screen changes for longer than --static seconds (house rule: <= 6 s)
  POP     single-frame flicker: frame i differs from both neighbours, but its neighbours match each other
  FLASH   whole-frame brightness jumps (the house style bans flashes)
Times are printed so they can be checked with: node tools/review.mjs <video> --at <time>
"""
import subprocess
import sys

import numpy as np

args = sys.argv[1:]
video = args[0]
static_max = float(args[args.index("--static") + 1]) if "--static" in args else 6.0

fps_txt = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate",
                          "-of", "csv=p=0", video], capture_output=True, text=True).stdout.strip().strip(",").splitlines()[0]
num, den = (int(x) for x in fps_txt.split("/"))
fps = num / den
W, H = 160, 90
proc = subprocess.Popen(["ffmpeg", "-v", "error", "-i", video, "-vf", f"scale={W}:{H},format=gray", "-f", "rawvideo", "-"],
                        stdout=subprocess.PIPE)
frames = []
while True:
    buf = proc.stdout.read(W * H)
    if len(buf) < W * H:
        break
    frames.append(np.frombuffer(buf, np.uint8).astype(np.float32))
proc.wait()
F = np.stack(frames)
n = len(F)
d1 = np.abs(np.diff(F, axis=0)).mean(axis=1)                 # change between consecutive frames
bright = F.mean(axis=1)
print(f"{n} frames at {fps:g} fps ({n / fps:.1f} s); median frame change {np.median(d1):.3f}")

# STATIC: change over a 0.5 s step below a small threshold, sustained.
step = max(1, round(fps / 2))
dstep = np.abs(F[step:] - F[:-step]).mean(axis=1)
quiet = dstep < 0.35
issues = []
i = 0
while i < len(quiet):
    if quiet[i]:
        j = i
        while j < len(quiet) and quiet[j]:
            j += 1
        if (j - i + step) / fps > static_max:
            issues.append((i / fps, f"STATIC  {(j - i + step) / fps:4.1f} s with no visible change, until {(j + step) / fps:.1f} s"))
        i = j
    else:
        i += 1

# POP: i differs from i-1 and i+1, but i-1 ~ i+1.
for i in range(1, n - 1):
    a, b = d1[i - 1], d1[i]
    if a > 2.0 and b > 2.0:
        skip = np.abs(F[i + 1] - F[i - 1]).mean()
        if skip < 0.25 * min(a, b):
            issues.append((i / fps, f"POP     frame {i} flickers (change {a:.1f} in, {b:.1f} out, {skip:.1f} across)"))

# FLASH: brightness jump of more than 25 levels in one frame.
for i in np.nonzero(np.abs(np.diff(bright)) > 25)[0]:
    issues.append((i / fps, f"FLASH   brightness {bright[i]:.0f} -> {bright[i + 1]:.0f}"))

for t, msg in sorted(issues):
    print(f"{int(t // 60)}:{t % 60:05.2f}  {msg}")
print(f"\n{len(issues)} issue(s)")
