"""Fit the exact ElevenLabs line onto a Seedance clip's speech timing.

usage: python -I fit_line.py <seedance.wav> <tts.wav> <out.wav> <clip_dur>
Finds phrases (speech runs) in both, pairs them 1:1 and time-stretches each TTS phrase
into its Seedance slot. If phrase counts differ, falls back to fitting the whole line
between first onset and last offset.
"""
import sys, wave, struct, subprocess, os, tempfile

def load(p):
    w = wave.open(p); sr = w.getframerate(); ch = w.getnchannels()
    d = w.readframes(w.getnframes()); s = struct.unpack("<%dh" % (len(d) // 2), d)
    if ch == 2: s = s[::2]
    return sr, s

def phrases(p, gap=0.18, minlen=0.12):
    sr, s = load(p); st = sr // 100
    env = [max(abs(x) for x in s[i:i + st]) for i in range(0, len(s) - st, st)]
    thr = max(env) * 0.12
    runs, start = [], None
    for i, v in enumerate(env + [0]):
        if v > thr and start is None: start = i
        if v <= thr and start is not None: runs.append([start, i]); start = None
    merged = []
    for r in runs:
        if merged and (r[0] - merged[-1][1]) / 100 < gap: merged[-1][1] = r[1]
        else: merged.append(r)
    return [(a / 100, b / 100) for a, b in merged if (b - a) / 100 >= minlen]

def atempo(f):  # chain atempo filters so each stays in 0.5..2
    parts = []
    while f > 2: parts.append(2.0); f /= 2
    while f < 0.5: parts.append(0.5); f /= 0.5
    parts.append(f)
    return ",".join("atempo=%.5f" % x for x in parts)

def run(*a): subprocess.run(a, check=True, capture_output=True)

def main(seed, tts, out, dur, windows=None):
    dur = float(dur)
    # target windows: given "a-b,c-d" (from transcript word times) or detected from the clip
    ps = [tuple(map(float, w.split("-"))) for w in windows.split(",")] if windows else phrases(seed)
    pt = phrases(tts)
    for g in (0.4, 0.3, 0.25, 0.2, 0.15, 0.12, 0.09, 0.06):  # split TTS until phrase counts match
        if len(pt) == len(ps): break
        pt = phrases(tts, gap=g)
    if len(ps) != len(pt) or not ps:
        ps, pt = [(ps[0][0], ps[-1][1])], [(pt[0][0], pt[-1][1])]
        mode = "whole-line"
    else:
        mode = "%d phrases" % len(ps)
    # Cut points sit in the middle of the silences between phrases (never at a word edge),
    # with lead-in/tail room at the ends, so every word keeps its natural attack and decay.
    sr_t, s_t = load(tts); tts_len = len(s_t) / sr_t
    LEAD, TAIL = 0.08, 0.25
    def bounds(p, total):
        b = [max(0.0, p[0][0] - LEAD)]
        b += [(p[i][1] + p[i + 1][0]) / 2 for i in range(len(p) - 1)]
        return b + [min(total, p[-1][1] + TAIL)]
    bt, bs = bounds(pt, tts_len), bounds(ps, dur)
    tmp = tempfile.mkdtemp(); inputs, filt = [], []
    for i in range(len(ps)):
        t0, t1, s0, s1 = bt[i], bt[i + 1], bs[i], bs[i + 1]
        # stretch from the speech spans only (silence padding must not change the rate); capped for natural delivery
        f = min(1.2, max(0.85, (pt[i][1] - pt[i][0]) / (ps[i][1] - ps[i][0])))
        seg = os.path.join(tmp, "p%d.wav" % i)
        out_len = (t1 - t0) / f
        run("ffmpeg", "-y", "-v", "error", "-ss", "%.3f" % t0, "-t", "%.3f" % (t1 - t0), "-i", tts,
            "-af", atempo(f) + ",aformat=sample_rates=44100:channel_layouts=mono,"
            "afade=t=in:d=0.02,afade=t=out:st=%.3f:d=0.06" % max(0, out_len - 0.06), seg)
        inputs += ["-i", seg]
        # anchor each segment so its speech onset lands on the mouth onset
        onset = (pt[i][0] - t0) / f
        start = max(0.0, ps[i][0] - onset)
        filt.append("[%d]adelay=%d:all=1[d%d]" % (i, int(start * 1000), i))
        print("  phrase %d: tts %.2f-%.2f -> clip %.2f (x%.2f)" % (i, t0, t1, start, f))
    n = len(ps)
    fc = ";".join(filt) + ";" + "".join("[d%d]" % i for i in range(n)) + \
        "amix=inputs=%d:normalize=0,apad=whole_dur=%.3f[o]" % (n, dur)
    run("ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex", fc, "-map", "[o]", "-t", "%.3f" % dur, out)
    print("  mode:", mode)

if __name__ == "__main__":
    main(*sys.argv[1:6])
