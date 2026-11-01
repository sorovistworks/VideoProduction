"""Captions file from word timings:

    uv run tools/srt.py docs/timing.json -o out/captions.srt [--script audio/narration.txt]

Upload the .srt to YouTube (accurate captions help search and accessibility), and feed it to
/yt-chapters and /yt-shorts. Cues break at sentence ends, at pauses, at 42 characters or 3.5 s.
Whisper splits numbers ("88" ",000.") and mishears homophones ("weight" for "wait"): numbers are rejoined, and
with --script every non-number word is replaced by the word actually written, so captions match the script.
Self-check: uv run tools/srt.py --test
"""
import difflib
import json
import re
import sys

MAX_CHARS, MAX_SEC, PAUSE = 42, 3.5, 0.6
norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))


def stamp(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def tidy(words):
    """Rejoin number pieces: '88' ',000.' -> '88,000.'; '1' '.12' -> '1.12'; '93' '%' -> '93%'."""
    out = []
    for w in words:
        s = w["w"].strip()
        if out and (re.match(r"^[.,]\d", s) or s.startswith("%")):
            out[-1] = {**out[-1], "w": out[-1]["w"] + s, "end": w["end"]}
        else:
            out.append({**w, "w": s})
    return out


def correct(words, script_text):
    """Replace mis-heard words with the script's words where the alignment pairs them one-to-one (no digits)."""
    written = [w for w in re.sub(r"\[[^\]]*\]", " ", script_text).split() if norm(w)]
    a, b = [norm(w) for w in written], [norm(w["w"]) for w in words]
    out = [dict(w) for w in words]
    for op, a0, a1, b0, b1 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        # spoken numbers ("nineteen seventy," -> "1970?"): keep the digits, take the script's end punctuation
        if op == "replace" and b1 > b0 and re.search(r"\d", out[b1 - 1]["w"]):
            punct = re.search(r"[.,?!:;]*$", written[a1 - 1].strip('"')).group()
            out[b1 - 1]["w"] = re.sub(r"[.,?!:;]+$", "", out[b1 - 1]["w"]) + punct
        if op in ("equal", "replace") and a1 - a0 == b1 - b0:
            for i, j in zip(range(a0, a1), range(b0, b1)):
                if not re.search(r"\d", out[j]["w"]) and not re.search(r"\d", written[i]):
                    out[j]["w"] = written[i].strip('"')
    return out


def cues(words):
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        text = " ".join(x["w"] for x in cur)
        nxt = words[i + 1] if i + 1 < len(words) else None
        if (nxt is None or w["w"][-1:] in ".?!" or nxt["start"] - w["end"] > PAUSE
                or len(text + " " + nxt["w"]) > MAX_CHARS or nxt["end"] - cur[0]["start"] > MAX_SEC):
            end = w["end"] + 0.2 if nxt is None else min(w["end"] + 0.2, nxt["start"])
            out.append((cur[0]["start"], end, text))
            cur = []
    return out


def render(words):
    return "\n".join(f"{i}\n{stamp(s)} --> {stamp(e)}\n{t}\n" for i, (s, e, t) in enumerate(cues(words), 1))


if __name__ == "__main__":
    if sys.argv[1:] == ["--test"]:
        ws = [{"w": w, "start": i * 0.3, "end": i * 0.3 + 0.25} for i, w in enumerate("One two three. Four five".split())]
        c = cues(ws)
        assert [t for _, _, t in c] == ["One two three.", "Four five"], c
        assert c[0][1] <= ws[3]["start"] and stamp(3723.5) == "01:02:03,500"
        tw = tidy([{"w": x, "start": i, "end": i + 0.5} for i, x in enumerate(["About", "88", ",000.", "Up", "93", "%"])])
        assert [w["w"] for w in tw] == ["About", "88,000.", "Up", "93%"], tw
        fixed = correct([{"w": x, "start": 0, "end": 0} for x in ["The", "typical", "weight", "was", "36"]], "The typical wait was thirty-six")
        assert [w["w"] for w in fixed] == ["The", "typical", "wait", "was", "36"], fixed
        print("srt.py ok")
    else:
        args = sys.argv[1:]
        out = args.pop(args.index("-o") + 1) if "-o" in args else None
        script = args.pop(args.index("--script") + 1) if "--script" in args else None
        args = [a for a in args if a not in ("-o", "--script")]
        # utf-8-sig: tolerate a BOM from PowerShell-written files
        words = tidy(json.load(open(args[0], encoding="utf-8-sig"))["words"])
        if script:
            words = correct(words, open(script, encoding="utf-8-sig").read())
        text = render(words)
        if out:
            open(out, "w", encoding="utf-8").write(text)
        else:
            print(text)
