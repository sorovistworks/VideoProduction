"""Compare a voice take's transcript with the script it was read from.

    uv run tools/scriptdiff.py audio/narration.txt docs/timing.json

Prints every dropped, added or changed word with its time in the take, then a score. [direction tags] are ignored.
Whisper may write numbers as digits where the script spells them out ("500" vs "five hundred"); such pairs are
listed separately as NUMBER so a human can confirm them, since a misspoken number is the costliest error.
"""
import difflib
import json
import re
import sys

norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))
script = [norm(w) for w in re.sub(r"\[[^\]]*\]", " ", open(sys.argv[1], encoding="utf-8-sig").read()).split()]
script = [w for w in script if w]
take = json.load(open(sys.argv[2], encoding="utf-8-sig"))["words"]
said = [norm(w["w"]) for w in take]
keep = [i for i, w in enumerate(said) if w]
said, take = [said[i] for i in keep], [take[i] for i in keep]

issues, numbers = [], []
for op, a0, a1, b0, b1 in difflib.SequenceMatcher(None, script, said, autojunk=False).get_opcodes():
    if op == "equal":
        continue
    t = take[min(b0, len(take) - 1)]["start"] if take else 0
    row = (t, op.upper(), " ".join(script[a0:a1]), " ".join(said[b0:b1]))
    (numbers if any(c.isdigit() for c in row[3]) else issues).append(row)

for t, op, want, got in issues:
    print(f"{t:7.2f}s  {op:<7} script: {want!r:<40} take: {got!r}")
for t, op, want, got in numbers:
    print(f"{t:7.2f}s  NUMBER  script: {want!r:<40} take: {got!r}")
matched = sum(b.size for b in difflib.SequenceMatcher(None, script, said, autojunk=False).get_matching_blocks())
print(f"\n{len(issues)} word issues, {len(numbers)} number spans to confirm, {matched / len(script):.1%} of script words matched")
