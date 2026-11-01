"""Sound toolkit: music and SFX synthesized in code, ducked under the voice, written as one mix.

In a project's audio/score.py (run from code-video/: uv run projects/<name>/audio/score.py):
    import sys; from pathlib import Path
    HERE = Path(__file__).resolve().parent
    sys.path.insert(0, str(HERE.parents[2] / "tools"))
    from sound import *
    DUR = 5.0
    music = silence(DUR)
    for i, t in enumerate(beat_times(120, bars=4, start=0.22)):
        place(music, marimba(hz(["D4", "F4", "A4", "C5"][i % 4])), t, -12)
    sfx = silence(DUR); place(sfx, hit(), 0.22); place(sfx, whoosh(), 0.55, -6)
    voice = load(HERE / "voice.mp3")
    write(HERE / "mix.wav", mix(duck(music, voice), sfx, voice))
Then `node tools/finish.mjs projects/<name>` masters to -14 LUFS / -1 dBTP.

Everything is seeded, so the same score.py always writes the same file.
Self-check: uv run tools/sound.py
"""
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
NOTES = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6,
         "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


# ---------- basics ----------
def db(x):
    return 10 ** (x / 20)


def hz(note):
    """'A4' -> 440.0, 'F#3' -> 185.0"""
    name, octave = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((NOTES[name] + 12 * (octave + 1) - 69) / 12)


def silence(sec):
    return np.zeros(int(round(sec * SR)))


def t_axis(sec):
    return np.arange(int(round(sec * SR))) / SR


def place(track, clip, at, gain_db=0.0):
    """Add clip into track starting at `at` seconds (in place). Clips past the end are trimmed."""
    i = int(round(at * SR))
    if i >= len(track):
        return track
    n = min(len(clip), len(track) - i)
    track[i:i + n] += clip[:n] * db(gain_db)
    return track


def beat_times(bpm, bars, per_bar=4, start=0.0, step=1.0):
    """Beat grid in seconds. step=0.5 gives 8ths, 0.25 gives 16ths."""
    n = int(bars * per_bar / step)
    return [start + k * step * 60 / bpm for k in range(n)]


def _filter(x, kind, cutoff, order=4):
    return sosfilt(butter(order, cutoff, kind, fs=SR, output="sos"), x)


def lowpass(x, cutoff):
    return _filter(x, "lowpass", cutoff)


def highpass(x, cutoff):
    return _filter(x, "highpass", cutoff)


def bandpass(x, lo, hi):
    return _filter(x, "bandpass", [lo, hi], 2)


def noise(sec, seed=1):
    return np.random.default_rng(seed).uniform(-1, 1, int(round(sec * SR)))


def decay(sec, rate):
    return np.exp(-t_axis(sec) * rate)


def fade(x, inn=0.003, out=0.01):
    """Short edge fades so no clip starts or ends with a click."""
    x = x.copy()
    a, b = int(inn * SR), int(out * SR)
    if a:
        x[:a] *= np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b)
    return x


# ---------- instruments ----------
def marimba(f, dur=0.9):
    t = t_axis(dur)
    x = np.sin(2 * np.pi * f * t) * decay(dur, 6) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * decay(dur, 22)
    return fade(x * 0.6)


def pluck(f, dur=0.8, seed=1, brightness=0.5):
    """Karplus-Strong string."""
    n, period = int(dur * SR), max(2, int(SR / f))
    buf = np.random.default_rng(seed).uniform(-1, 1, period)
    out = np.empty(n)
    damp = 0.5 * (0.996 + 0.004 * brightness)
    for i in range(n):
        out[i] = buf[i % period]
        buf[i % period] = damp * (buf[i % period] + buf[(i + 1) % period])
    return fade(out * 0.7)


def keys(f, dur=1.2):
    """Soft felt-piano-ish tone."""
    t = t_axis(dur)
    x = sum(a * np.sin(2 * np.pi * f * k * t) for k, a in ((1, 1.0), (2, 0.4), (3, 0.15)))
    return fade(lowpass(x * decay(dur, 3.5), 3000) * 0.45)


def pad(freqs, dur, attack=0.6):
    """Detuned saw chord, low-passed, slow attack. freqs: list of Hz."""
    t = t_axis(dur)
    x = sum(((f * d * t) % 1.0) * 2 - 1 for f in freqs for d in (0.997, 1.0, 1.003))
    env = np.minimum(1, t / attack) * np.minimum(1, (dur - t) / 0.5)
    return lowpass(x * env, 1400) * 0.12 / max(1, len(freqs))


def bass(f, dur=0.4):
    t = t_axis(dur)
    return fade(np.tanh(2 * np.sin(2 * np.pi * f * t)) * decay(dur, 5) * 0.5)


def kick(dur=0.45):
    t = t_axis(dur)
    phase = 2 * np.pi * np.cumsum(45 + 110 * np.exp(-t * 30)) / SR
    return fade(np.sin(phase) * decay(dur, 8))


def snare(dur=0.25, seed=2):
    t = t_axis(dur)
    body = np.sin(2 * np.pi * 190 * t) * decay(dur, 25)
    return fade((0.5 * body + 0.6 * highpass(noise(dur, seed), 1500) * decay(dur, 18)) * 0.6)


def hat(dur=0.06, seed=3):
    return fade(highpass(noise(dur, seed), 7000) * decay(dur, 60) * 0.35)


# ---------- SFX ----------
def whoosh(dur=0.5, seed=4, up=True):
    """Noise through a moving band. Place it so its peak (~70%) lands on the move."""
    x, t = noise(dur, seed), t_axis(dur)
    sweep = (t / dur) if up else (1 - t / dur)
    centre = 300 + 4000 * sweep ** 2
    out = np.zeros_like(x)
    for k in range(8):  # piecewise band-pass sweep
        lo, hi = int(k * len(x) / 8), int((k + 1) * len(x) / 8)
        c = centre[(lo + hi) // 2]
        out[lo:hi] = bandpass(x, c * 0.6, min(c * 1.6, SR / 2 - 100))[lo:hi]
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return fade(out * env * 1.2, 0.01, 0.05)


def hit(dur=0.9, seed=5):
    """Layered impact: sub thump + body + noise crack."""
    t = t_axis(dur)
    sub = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t * 18)) / SR) * decay(dur, 4)
    crack = highpass(noise(dur, seed), 2000) * decay(dur, 30)
    body = lowpass(noise(dur, seed + 1), 600) * decay(dur, 10)
    return fade(np.tanh(1.5 * (sub + 0.35 * crack + 0.5 * body)) * 0.8)


def sub_boom(dur=1.6):
    t = t_axis(dur)
    return fade(np.sin(2 * np.pi * np.cumsum(32 + 30 * np.exp(-t * 6)) / SR) * decay(dur, 2.2) * 0.9)


def click(seed=6):
    return fade(bandpass(noise(0.03, seed), 1800, 6000) * decay(0.03, 160) * 0.5, 0.0005, 0.005)


def tick(f=2200):
    t = t_axis(0.02)
    return fade(np.sin(2 * np.pi * f * t) * decay(0.02, 250) * 0.4, 0.0005, 0.003)


def blip(f=900, dur=0.12):
    """Soft 'pop' for an object appearing: a sine that drops in pitch."""
    t = t_axis(dur)
    return fade(np.sin(2 * np.pi * np.cumsum(f * (1 + 0.8 * np.exp(-t * 40))) / SR) * decay(dur, 35) * 0.5, 0.001, 0.02)


def chime(f=1760, dur=1.2):
    t = t_axis(dur)
    x = sum(a * np.sin(2 * np.pi * f * k * t) for k, a in ((1, 1), (2.76, 0.4), (5.4, 0.15)))
    return fade(x * decay(dur, 4) * 0.3)


def riser(dur=2.0, seed=7):
    """Noise + pitch rise into a hit. End it exactly on the downbeat."""
    t = t_axis(dur)
    pitch = np.sin(2 * np.pi * np.cumsum(200 + 1600 * (t / dur) ** 3) / SR)
    env = (t / dur) ** 2
    return fade((0.5 * highpass(noise(dur, seed), 800) + 0.3 * pitch) * env * 0.7, 0.01, 0.002)


# ---------- mixing ----------
def load(path):
    """Any audio file -> mono float at SR."""
    import librosa
    return librosa.load(path, sr=SR, mono=True)[0]


RATE = 1000  # control rate for envelopes (Hz)


def _peaks(x):
    step = SR // RATE
    return np.abs(np.pad(x, (0, (-len(x)) % step))).reshape(-1, step).max(axis=1)


def _follow(x, attack, release):
    """One-pole follower with separate attack/release, at control rate."""
    a, r = np.exp(-1 / (attack * RATE)), np.exp(-1 / (release * RATE))
    out, level = np.empty_like(x), 0.0
    for i, v in enumerate(x):
        k = a if v > level else r
        level = k * level + (1 - k) * v
        out[i] = level
    return out


def duck(music, voice, depth_db=12.0, threshold_db=-40.0, attack=0.03, release=0.35):
    """Pull music down by depth_db wherever the voice speaks (sidechain).
    A fast detector decides "speaking"; attack/release shape the gain, so release time holds at any voice level.
    Set the music's own level so it already sits ~15 dB under the voice; ducking adds clarity on top."""
    n = max(len(music), len(voice))
    m, v = np.pad(music, (0, n - len(music))), np.pad(voice, (0, n - len(voice)))
    level = _follow(_peaks(v), 0.002, 0.05)
    speaking = np.clip((20 * np.log10(level + 1e-9) - threshold_db) / 6, 0, 1)
    amount = _follow(speaking, attack, release)
    amount = np.interp(np.arange(n) / (SR // RATE), np.arange(len(amount)), amount)
    return m * db(-depth_db * amount)


def mix(*tracks):
    n = max(len(t) for t in tracks)
    return sum(np.pad(t, (0, n - len(t))) for t in tracks)


def write(path, x):
    """24-bit WAV. Peaks are kept under -1 dBFS here; finish.mjs sets the final loudness."""
    import soundfile as sf
    peak = np.max(np.abs(x)) or 1.0
    sf.write(path, x * min(1.0, db(-1) / peak), SR, subtype="PCM_24")


if __name__ == "__main__":
    # Self-check: ducking depth, grid timing, determinism, peak safety.
    assert abs(hz("A4") - 440) < 1e-9 and abs(hz("C4") - 261.6256) < 1e-3
    assert abs(beat_times(120, 1)[1] - 0.5) < 1e-12 and abs(beat_times(120, 1, step=0.25)[1] - 0.125) < 1e-12
    music = np.sin(2 * np.pi * 220 * t_axis(4)) * 0.3
    voice = silence(4)
    voice[SR:2 * SR] = np.sin(2 * np.pi * 300 * t_axis(1)) * 0.5
    ducked = duck(music, voice, depth_db=12)
    rms = lambda x: np.sqrt(np.mean(x ** 2))
    drop = 20 * np.log10(rms(music[int(1.3 * SR):int(1.7 * SR)]) / rms(ducked[int(1.3 * SR):int(1.7 * SR)]))
    assert 11.5 < drop < 12.5, drop
    recovered = 20 * np.log10(rms(music[int(3.2 * SR):]) / rms(ducked[int(3.2 * SR):]))
    assert recovered < 0.5, recovered  # back within 0.5 dB ~1.2 s after the voice stops
    assert np.array_equal(whoosh(), whoosh()) and np.array_equal(hit(), hit())
    for clip in (marimba(440), pluck(220), keys(330), kick(), snare(), hat(), whoosh(), hit(), sub_boom(), click(), chime(), riser()):
        assert np.isfinite(clip).all() and np.max(np.abs(clip)) < 2.5
    print(f"sound.py ok: duck {drop:.1f} dB, all instruments finite and deterministic")
