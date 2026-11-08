"""Single source of truth for the reel-1 edit: cuts, captions, graphics and sound cues.

Picture (build.py -> index.html) and sound (../audio/score.py) both import this file,
so every caption, pop and hit lands on the same frame. All times in seconds.
"""

# (clip file, media in-point, media out-point) in reel order
CLIPS = [
    ("s01", 0.00, 4.55),   # Itna chawal? Apne papa jaisa... + Papa's hurt look
    ("s02", 0.00, 2.60),   # Par Dadi, ye toh sab khaate hain!
    ("s03", 0.00, 7.95),   # Haan, aur sab doctor... / Polish karke... / Ab bas starch...
    ("s04", 1.60, 3.60),   # Toh? (snap zoom)
    ("s05", 0.00, 6.95),   # sugar / bhookh / pahaad / diabetes
    ("s05b", 1.40, 3.50),  # Phir khaaun kya? (slump trimmed so the hand lands at 1:03)
    ("s06", 0.00, 2.30),   # Wahi, jo hum khaate the. (VO over the jars)
    ("s07-09", 0.00, 11.95),  # brown / red / black VO
    ("s10", 0.00, 5.04),   # Taste toh ganda... spoon... Mmm! Mmm!
    ("s11", 0.00, 8.04),   # CTA setup
    ("s12", 0.00, 5.65),   # Comment karo RICE... (tail trimmed)
    ("s13", 0.15, 5.04),   # aap jo chai pee rahe ho... hand entry sped up (minterpolate) so it lands as his voice ends
]

# Whole-reel pace. Clip files in assets/clips are the 1x originals (../clips-1x) sped by this
# factor with ../scripts/speed_clips.sh; every time in this file stays in 1x clip time.
SPEED = 1.1
CLIPS = [(n, round(a / SPEED, 3), round(b / SPEED, 3)) for n, a, b in CLIPS]

START = {}
_t = 0.0
for name, a, b in CLIPS:
    START[name] = round(_t, 3)
    _t += b - a
DURATION = round(_t, 3)
TRIM = {name: a for name, a, b in CLIPS}


def at(clip, t):
    """Reel time of a moment given in the clip's own (untrimmed) time."""
    return round(START[clip] + t / SPEED - TRIM[clip], 3)


# Captions: (clip, in-clip start, in-clip end, text). *word* = highlighted in the accent colour.
CAPTIONS = [
    ("s01", 0.80, 1.70, "Itna *chawal?*"),
    ("s01", 2.55, 4.45, "Apne *papa jaisa* banna hai kya?"),
    ("s02", 0.10, 2.45, "Par Dadi, ye toh *sab khaate hain!*"),
    ("s03", 0.20, 3.10, "Haan, aur sab *doctor* ke chakkar bhi lagaate hain."),
    ("s03", 3.65, 5.85, "Polish karke *fibre* utaar diya."),
    ("s03", 5.88, 7.90, "Ab bas *starch* bacha hai."),
    ("s04", 2.38, 3.55, "*Toh?*"),
    ("s05", 0.20, 1.55, "Toh *sugar* jaldi upar,"),
    ("s05", 1.80, 3.35, "*bhookh* jaldi wapas…"),
    ("s05", 3.78, 5.00, "aur roz ka *pahaad?*"),
    ("s05", 5.38, 6.90, "*Diabetes* ka risk."),
    ("s05b", 1.78, 3.85, "Phir *khaaun kya?*"),
    ("s06", 0.28, 2.28, "Wahi, jo *hum khaate the.*"),
    ("s07-09", 0.20, 1.70, "*Brown.* Upar ki parat saath hai,"),
    ("s07-09", 1.70, 3.95, "pet der tak bhara."),
    ("s07-09", 4.00, 5.60, "*Red.* Kerala ka Matta."),
    ("s07-09", 5.60, 7.75, "Rang hi *antioxidant* hai."),
    ("s07-09", 7.80, 9.40, "*Black.* Forbidden rice."),
    ("s07-09", 9.40, 11.90, "Kabhi sirf *raja* khaate the."),
    ("s10", 0.22, 1.75, "Taste toh *ganda* hi hoga na—"),
    ("s10", 3.70, 5.04, "*Mmm! Mmm!*"),
    ("s11", 0.14, 2.45, "Agar aapko bhi *white rice* badalna hai,"),
    ("s11", 2.60, 4.75, "aur *red ya brown* try karna hai,"),
    ("s11", 4.80, 6.40, "par pata nahi kahan milega"),
    ("s11", 6.40, 8.04, "ya kaunsa *best* hai…"),
    ("s12", 0.12, 1.42, "Comment karo *'RICE'.*"),
    ("s12", 1.45, 3.38, "Main best rice ka *guide,*"),
    ("s12", 3.42, 4.45, "*link* ke saath,"),
    ("s12", 4.68, 5.65, "share kar dungi."),
    ("s13", 0.18, 1.75, "Dadi, ye sab toh theek hai,"),
    ("s13", 1.72, 3.55, "par aap jo *chai* pee rahe ho…"),
]

# Key moments the graphics and the score both use
HOOK_END = 2.3
GRAIN_PEEL = at("s03", 3.75)       # bran peels off the grain
GRAIN_STARCH = at("s03", 5.95)     # "starch" label
COUNT = [at("s05", 0.25), at("s05", 1.85), at("s05", 3.82), at("s05", 5.42)]  # Dadi's points
JARS = {"brown": at("s07-09", 0.15), "red": at("s07-09", 3.95), "black": at("s07-09", 7.75)}
JARS_END = at("s07-09", 11.95)
SPOON_POP = at("s10", 1.92)
MMM = at("s10", 3.72)
RICE_WORD = at("s12", 0.55)
HAND_WHOOSH = at("s13", 3.42)       # his voice ends 3.40, hand enters 3.49
EAR_GRAB = at("s13", 3.62)
SCREAM = at("s13", 3.68)           # his mouth opens 3.71
CUTS = [START[n] for n, *_ in CLIPS][1:]

if __name__ == "__main__":
    for n, *_ in CLIPS:
        print(f"{n:7s} starts {START[n]:6.2f}")
    print("duration", DURATION)
