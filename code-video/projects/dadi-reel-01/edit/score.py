"""Reel-1 sound: dialogue from the approved clips + original playful desi groove + SFX on the graphics.

Run from code-video/:  uv run projects/dadi-reel-01/edit/score.py
Writes edit/assets/audio/mix.wav (unmastered; mastered to -14 LUFS after the render).
"""
import subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[2] / "tools"))
sys.path.insert(0, str(HERE))
from sound import *  # noqa: E402,F403
import timeline as T  # noqa: E402

DUR = T.DURATION + 0.3
rng = np.random.default_rng(11)

# ---------- dialogue: each clip's finished audio, cut exactly as the picture ----------
voice = silence(DUR)
tmp = Path(tempfile.mkdtemp())
for name, a, b in T.CLIPS:
    wav = tmp / f"{name}.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-ss", f"{a}", "-t", f"{b - a}",
                    "-i", str(HERE / "assets/clips" / f"{name}.mp4"), "-vn", "-ac", "1", "-ar", str(SR),
                    "-af", "afade=t=in:d=0.01,afade=t=out:st=%.3f:d=0.03" % (b - a - 0.03), str(wav)], check=True)
    place(voice, load(wav), T.START[name])

# ---------- music: 104 bpm, D major pentatonic, tabla-ish groove ----------
BPM = 104
beat = 60 / BPM
music = silence(DUR)
music_end = T.at("s13", 0.20)              # music fades out as Rohan's last line starts: he speaks dry, then the hand
D_PENT = ["D4", "E4", "F#4", "A4", "B4", "D5", "E5"]
motif = [0, 2, 3, 2, 4, 3, 2, 1, 0, 2, 3, 5, 4, 3, 2, 0]  # 16 eighths = 2 bars
bassline = ["D2", "D2", "A2", "A2", "B2", "B2", "A2", "F#2"]


def dayan(f, seed):  # bright tabla-ish "ta"
    return pluck(f, dur=0.22, seed=seed, brightness=0.85) * 0.8


def bayan():  # low pitch-bent "ge"
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    fr = 95 + 55 * np.exp(-t * 18)
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 9)


t = 0.2
i = 0
while t < music_end:
    bar_pos = i % 8                      # eighth-note within a bar
    if bar_pos in (0, 3, 6):
        place(music, bayan(), t, -6)
    if bar_pos in (2, 4, 7):
        place(music, dayan(hz("D5"), seed=i), t, -12)
    place(music, hat(seed=100 + i), t + beat / 4, -24)
    if i % 2 == 0:
        place(music, bass(hz(bassline[(i // 2) % 8]), dur=0.35), t, -10)
    # melody rests during the jars VO so the facts breathe, comes back for the CTA
    in_jars = T.JARS["brown"] - 0.2 < t < T.JARS_END
    if not in_jars and (i // 16) % 2 == 0 or (in_jars and i % 4 == 0):
        place(music, marimba(hz(D_PENT[motif[i % 16]]), dur=0.5), t, -14)
    t += beat / 2
    i += 1
music = lowpass(music, 7000)
fade_n = int(0.25 * SR)
k = int(music_end * SR)
music[k - fade_n:k] *= np.linspace(1, 0, fade_n)
music[k:] = 0

# ---------- sfx ----------
sfx = silence(DUR)


# real recorded SFX (myinstants.com, files in ../audio/sfx/real); `start` skips each file's lead-in
def real(name, at, gain_db, start=0.0, keep=None, fade_in=0.003, fade_out=0.05):
    x = load(HERE.parent / "audio/sfx/real" / f"{name}.wav")[int(start * SR):]
    if keep:
        x = x[: int(keep * SR)]
    place(sfx, fade(x, fade_in, fade_out), at, gain_db)


real("impact", 0.04, -4, keep=1.4, fade_out=0.4)           # hook slam: WHITE RICE
real("pop", 0.55, -8)                                      # EVERY DAY? pops in
real("whoosh", T.GRAIN_PEEL - 0.3, -6)                     # bran peels off
real("pop", T.GRAIN_STARCH, -8)                            # STARCH label
for c in T.COUNT:                                          # Dadi's points
    real("pop", c + 0.05, -8)
for t0 in T.JARS.values():                                 # rice fact types in
    real("whoosh", t0 - 0.25, -8)
real("whoosh", T.SPOON_POP - 0.3, -4)                      # spoon flies in
real("nom", T.SPOON_POP, 16, start=0.17, keep=1.0, fade_out=0.2)   # the bite

# trending India meme sounds (myinstants.com/en/index/in), each cut to end before the next line
def meme(name, at, gain_db, keep, fade_out=0.25):
    x = load(HERE.parent / "audio/sfx/meme" / f"{name}.wav")[: int(keep * SR)]
    place(sfx, fade(x, 0.003, fade_out), at, gain_db)


meme("vine-boom", T.at("s01", 4.20), -8, 0.50, 0.2)     # after "papa jaisa banna hai kya?"
meme("fahhh", T.at("s03", 3.12), -16, 0.75, 0.3)        # after "doctor ke chakkar bhi lagaate hain."
meme("sad-violin", T.at("s05", 6.80), -10, 2.25, 0.4)   # under "Phir khaaun kya?", out before Dadi's "Wahi"
meme("anime-wow", T.at("s10", 3.58), -6, 1.42, 0.35)    # his smile + thumbs-up after the first bite
real("typing", T.RICE_WORD + 0.12, 6, start=0.27, keep=0.5, fade_out=0.08)  # typing R-I-C-E
real("ding", T.RICE_WORD + 0.62, 0, keep=1.15, fade_out=0.3)              # comment sent
real("whoosh-fast", T.HAND_WHOOSH - 0.1, 6, start=0.2, keep=0.6)       # the hand
real("slap", T.EAR_GRAB, -16, start=0.08, keep=0.5, fade_out=0.1)       # the grab
place(voice, load(HERE.parent / "audio/sfx/tuco-get-out.wav"), T.SCREAM, -4)   # Rohan's scream (user-supplied sound)

out = HERE / "assets/audio/mix.wav"
out.parent.mkdir(parents=True, exist_ok=True)
write(out, mix(sfx, voice))  # no background music (user, 2026-11-08); `music` above is unused
print("wrote", out, f"{DUR:.2f}s")
