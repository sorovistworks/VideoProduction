"""SOUND owns this file. The cold open's score and every effect, synthesized with numpy from fixed seeds:
a re-run writes the same file. Run from code-video/:  uv run projects/<name>/audio/score.py

Timing comes from docs/cutlist.json (cuts + window.EVENTS, written by `node engine/render-film.mjs <project> --meta`),
never from hand-typed times. Every hit goes on the cue sheet (docs/cues.json); check the real onsets with
`uv run tools/cues.py projects/<name>/audio/sfx.wav projects/<name>/docs/cues.json`.
Voices: docs/voices.json (generated on Higgsfield / ElevenLabs, best take picked with tools/takes.py).
"""
import json
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
PROJ = HERE.parent
sys.path.insert(0, str(HERE.parents[2] / "tools"))
from sound import *          # noqa: E402,F403
from cues import CueSheet, place_voices  # noqa: E402

meta = json.loads((PROJ / "docs" / "cutlist.json").read_text(encoding="utf-8"))
FPS, DUR, EV = meta["fps"], meta["duration"], meta["events"]
cut = {c["id"]: c for c in meta["cuts"]}
cs = CueSheet(FPS)
frame = lambda t: round(t * FPS)

music, sfx, amb = silence(DUR + 2), silence(DUR + 2), silence(DUR + 2)

# --- tension pulse: a heartbeat that starts before the film, so it is already running at frame 0
place(amb, heartbeat(EV["scratch"] + 0.2, bpm=70, start=-1.3, gain=0.5), 0)

# --- main theme: bouncy folk-pop, 118 BPM, plucked strings + marimba, quiet under the action
BPM = 118
prog = [["D4", "F#4", "A4"], ["G3", "B3", "D4"], ["A3", "C#4", "E4"], ["D4", "F#4", "A4"]]
melody = ["A4", "B4", "A4", "F#4", "E4", "F#4", "D4", "E4"]
for i, t in enumerate(beat_times(BPM, bars=8, start=0.0)):
    chord = prog[(i // 4) % 4]
    place(music, pluck(hz(chord[0]) / 2, 0.5, seed=40 + i), t, -10)
    if i % 2 == 0:
        place(music, marimba(hz(melody[(i // 2) % len(melody)])), t, -14)
    if i % 4 == 2:
        place(music, pluck(hz(chord[1]), 0.4, seed=90 + i, brightness=0.8), t, -16)
music = reverb(music, 1.2, 0.18)[:len(music)]

# --- the inhale: breathy noise rising into the sneeze
inh = EV["inhale"]
n = EV["sneeze"] - inh - 0.08
breath = bandpass(noise(n, 51), 500, 2600) * np.linspace(0, 1, int(round(n * SR))) ** 1.6 * 0.35
cs.place(sfx, fade(breath, 0.05, 0.02), seconds=inh, name="inhale", swell=True)

# --- the sneeze-gust: hit + whoosh + leaves (silence right before it lands)
cs.place(sfx, hit(0.8, seed=52), frame=frame(EV["sneeze"]), name="sneeze-hit")
cs.place(sfx, whoosh(0.9, seed=53), seconds=EV["sneeze"], onset=0.1, name="gust-whoosh", gain_db=-2)
leaves = highpass(noise(1.2, 54), 2500) * decay(1.2, 2.5) * 0.25
cs.place(sfx, fade(leaves, 0.01, 0.2), seconds=EV["sneeze"] + 0.04, name="leaves")
music[int((EV["sneeze"] - 0.2) * SR):int(EV["sneeze"] * SR)] *= np.linspace(1, 0.2, int(round(0.2 * SR)))

# --- record scratch: the music itself is scratched as time stops; then near-silence and a high shimmer
music = record_scratch(music, EV["scratch"])
amb[int(EV["scratch"] * SR):] = 0
cs.place(sfx, chime(2637, 2.4) * 0.5, frame=frame(EV["scratch"]) + 6, name="freeze-shimmer", gain_db=-14)

# --- the fly-in through the frozen leaves: one long whoosh peaking on arrival, a soft tick when it lands
fly = EV["arrive"] - EV["flyStart"]
cs.place(sfx, whoosh(fly + 0.3, seed=55), seconds=EV["flyStart"], name="fly-in", gain_db=-6, swell=True)
cs.place(sfx, tick(1600), frame=frame(EV["arrive"]), name="arrive-tick", gain_db=-4)

# --- rewind: the theme played backwards, fast, under a reversed whoosh
rw = cut["s04"]
seg = music[:int(4 * SR)].copy()
back = varispeed(seg[::-1], 2.0)[:int((rw["end"] - rw["start"]) * SR)]
place(music, fade(back, 0.02, 0.05) * 0.8, rw["start"])
cs.place(sfx, whoosh(rw["end"] - rw["start"], seed=56, up=False)[::-1], seconds=rw["start"], name="rewind", gain_db=-8, swell=True)

# --- calm again: the theme resumes on the cut
calm = cut["s05"]["start"]
for i, t in enumerate(beat_times(BPM, bars=1, start=calm)):
    place(music, pluck(hz(prog[0][0]) / 2, 0.6, seed=70 + i), t, -10)
    place(music, marimba(hz(melody[i % len(melody)])), t, -14)
cs.place(sfx, blip(700), frame=frame(calm), name="calm-blip", gain_db=-12)

# --- voices (if any) and the mix: music well under the words, bus glue, tape
voice = silence(DUR + 2)
vj = PROJ / "docs" / "voices.json"
if vj.exists() and json.loads(vj.read_text(encoding="utf-8")):
    place_voices(voice, vj)
bed = mix(music * db(-6), amb * db(-8))
out = mix(duck(bed, voice, depth_db=10), sfx, voice)
out = tape(compress(out, -16, 2.5, makeup_db=2), 1.3)[:int(round(DUR * SR))]

cs.save(PROJ / "docs" / "cues.json")
write(HERE / "sfx.wav", sfx[:len(out)])
write(HERE / "mix.wav", out)
print(f"{HERE / 'mix.wav'}  {len(out) / SR:.2f}s, {len(cs.cues)} cues -> docs/cues.json")
