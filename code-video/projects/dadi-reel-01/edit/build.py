"""Write index.html (the HyperFrames composition) from timeline.py.

Run: python -I build.py   (from this folder)
"""
import html, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import timeline as T  # noqa: E402
W, H, FPS = 1080, 1920, 24
D = T.DURATION


def fmt(x):
    return f"{x:.3f}"


def cap_html(text):
    out = html.escape(text)
    return re.sub(r"\*(.+?)\*", r'<span class="hl">\1</span>', out)


els, anim = [], []   # DOM strings, GSAP lines

# Hand-drawn SVG icons (no emoji font in the renderer)
ICON = {
    "bowl": '<svg viewBox="0 0 64 64" class="ico"><path d="M8 30h48a24 22 0 0 1-48 0z" fill="#0E7C74"/>'
            '<path d="M14 30c2-12 34-12 36 0z" fill="#fff8e8"/><circle cx="25" cy="24" r="3" fill="#e9dcc0"/>'
            '<circle cx="36" cy="22" r="3" fill="#e9dcc0"/><rect x="20" y="52" width="24" height="5" rx="2" fill="#0a5c56"/></svg>',
    "chart": '<svg viewBox="0 0 64 64" class="ico"><path d="M8 52h48" stroke="#141414" stroke-width="5" fill="none"/>'
             '<path d="M10 46l14-14 10 8 18-22" stroke="#d6402b" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
             '<path d="M42 16h12v12" stroke="#d6402b" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "plate": '<svg viewBox="0 0 64 64" class="ico"><circle cx="34" cy="34" r="22" fill="#fff" stroke="#141414" stroke-width="4"/>'
             '<circle cx="34" cy="34" r="12" fill="none" stroke="#c9c2b2" stroke-width="3"/>'
             '<path d="M6 12v40M2 12v12a4 4 0 0 0 8 0V12" stroke="#141414" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
    "mountain": '<svg viewBox="0 0 64 64" class="ico"><path d="M4 54L24 18l10 16 6-8 20 28z" fill="#f4efe3" stroke="#141414" stroke-width="4" stroke-linejoin="round"/>'
                '<path d="M17 31l7-13 7 11-4 3-3-4z" fill="#fff"/></svg>',
    "warn": '<svg viewBox="0 0 64 64" class="ico"><path d="M32 6L60 56H4z" fill="#F5B82E" stroke="#141414" stroke-width="4" stroke-linejoin="round"/>'
            '<rect x="29" y="22" width="6" height="18" rx="3" fill="#141414"/><circle cx="32" cy="47" r="3.5" fill="#141414"/></svg>',
    "crown": '<svg viewBox="0 0 64 64" class="ico"><path d="M8 48L4 18l16 12L32 10l12 20 16-12-4 30z" fill="#F5B82E" stroke="#141414" stroke-width="4" stroke-linejoin="round"/>'
             '<rect x="8" y="50" width="48" height="7" rx="3" fill="#141414"/></svg>',
    "down": '<svg viewBox="0 0 64 64" class="ico"><path d="M24 6h16v28h12L32 58 12 34h12z" fill="#F5B82E" stroke="#141414" stroke-width="5" stroke-linejoin="round"/></svg>',
    "send": '<svg viewBox="0 0 64 64" class="ico"><path d="M6 8l54 24L6 56l8-24z" fill="#0E7C74"/></svg>',
    "dadi": '<svg viewBox="0 0 64 64" class="ico"><circle cx="32" cy="32" r="30" fill="#f1e3c4"/><circle cx="32" cy="22" r="12" fill="#d9dde2"/>'
            '<circle cx="32" cy="32" r="13" fill="#c98f62"/><circle cx="26" cy="31" r="5" fill="none" stroke="#c9a23a" stroke-width="2"/>'
            '<circle cx="38" cy="31" r="5" fill="none" stroke="#c9a23a" stroke-width="2"/><circle cx="32" cy="23" r="2" fill="#c0242b"/>'
            '<path d="M14 64c2-12 10-16 18-16s16 4 18 16z" fill="#0E7C74"/></svg>',
}

# ---------- footage ----------
for i, (name, a, b) in enumerate(T.CLIPS):
    els.append(f'<video id="v{i}" class="clip shot" src="assets/clips/{name}.mp4" muted playsinline '
               f'data-start="{fmt(T.START[name])}" data-duration="{fmt(b - a)}" data-media-start="{fmt(a)}" '
               f'data-track-index="0"></video>')
els.append(f'<audio id="mix" src="assets/audio/mix.wav" data-start="0" data-duration="{fmt(D)}" '
           f'data-volume="1" data-track-index="1"></audio>')

# ---------- hook ----------
els.append(f'''<div id="hook" class="clip layer" data-start="0" data-duration="{fmt(T.HOOK_END)}" data-track-index="2">
  <div class="hook-line big" id="hook1"><span class="hook-box" id="hookbox"></span><span class="hook-txt">WHITE RICE</span></div>
  <div class="hook-line" id="hook2">EVERY DAY? {ICON["bowl"]}</div>
</div>''')
anim += [
    'tl.fromTo("#hook1",{scale:1.45,opacity:0},{scale:1,opacity:1,duration:0.22,ease:"power4.out"},0.02);',
    'tl.fromTo("#hook2",{scale:1.45,opacity:0},{scale:1,opacity:1,duration:0.22,ease:"power4.out"},0.40);',
    'tl.fromTo("#hookbox",{scaleX:0},{scaleX:1,duration:0.28,ease:"power3.out"},0.08);',
    f'tl.to("#hook",{{y:-60,opacity:0,duration:0.2,ease:"power2.in"}},{fmt(T.HOOK_END - 0.22)});',
]

# ---------- captions ----------
CAP_Y = {"s04": 1560, "s05b": 1440}  # extreme close-ups: below the chin
for k, (clip, s, e, text) in enumerate(T.CAPTIONS):
    clip_end = T.START[clip] + dict((n, b - a) for n, a, b in T.CLIPS)[clip]
    t0, t1 = T.at(clip, s), min(T.at(clip, e), clip_end, D)
    nxt = T.at(*T.CAPTIONS[k + 1][:2]) if k + 1 < len(T.CAPTIONS) else D
    t1 = min(clip_end, max(t1, min(nxt - 0.02, t1 + 0.8)))  # hold for reading, never past its own shot
    if clip == "s13":
        t1 = min(t1, T.HAND_WHOOSH)  # the last line clears as the hand arrives
    top = CAP_Y.get(clip, 1300)
    cid = f"cap{k}"
    els.append(f'<div id="{cid}" class="clip cap" style="top:{top}px" data-start="{fmt(t0)}" data-duration="{fmt(t1 - t0)}" '
               f'data-track-index="3"><div class="cap-in">{cap_html(text)}</div></div>')
    anim.append(f'tl.fromTo("#{cid} .cap-in",{{y:26,opacity:0}},{{y:0,opacity:1,duration:0.14,ease:"power3.out"}},{fmt(t0)});')

# ---------- grain illustration (shot 3) ----------
g0, g1 = T.GRAIN_PEEL - 0.35, T.START["s04"]
els.append(f'''<div id="grain" class="clip layer" data-start="{fmt(g0)}" data-duration="{fmt(g1 - g0)}" data-track-index="4">
  <div class="grain-card" id="graincard">
    <svg viewBox="0 0 400 200" class="grain-svg">
      <!-- the white (polished) grain underneath -->
      <path d="M48 100 C60 38 320 30 352 100 C320 170 60 162 48 100Z" fill="#fffdf6" stroke="#2a2016" stroke-width="7"/>
      <path d="M90 82 C150 62 250 60 300 78" fill="none" stroke="#e7dcc4" stroke-width="8" stroke-linecap="round"/>
      <text id="starchtxt" x="200" y="116" text-anchor="middle" font-family="Inter" font-weight="900" font-size="46" fill="#c4511f" opacity="0">STARCH</text>
      <!-- the bran coat that gets polished off -->
      <g id="bran">
        <path d="M30 100 C44 22 334 12 370 100 C334 186 44 178 30 100Z" fill="#a8743f" stroke="#2a2016" stroke-width="7"/>
        <path d="M70 70 C140 48 260 46 330 68 M60 100 C150 86 260 86 344 100 M70 130 C150 150 260 152 330 132"
              fill="none" stroke="#7d5229" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="56" cy="100" rx="16" ry="26" fill="#e8c35a" stroke="#2a2016" stroke-width="5"/>
        <text x="210" y="114" text-anchor="middle" font-family="Inter" font-weight="900" font-size="38" fill="#fff">BRAN · FIBRE</text>
      </g>
    </svg>
    <div class="grain-label" id="gl1">Polishing strips the bran:<br/><span class="hl">fibre, magnesium, B vitamins</span></div>
    <div class="grain-label" id="gl2">What's left: <span class="hl">~80% carbs</span>,<br/>mostly starch</div>
  </div>
</div>''')
anim += [
    f'tl.fromTo("#graincard",{{y:-40,opacity:0}},{{y:0,opacity:1,duration:0.3,ease:"power3.out"}},{fmt(g0)});',
    f'tl.fromTo("#bran",{{x:0,y:0,rotation:0,opacity:1}},{{x:300,y:-190,rotation:28,opacity:0,duration:0.6,ease:"power2.in",transformOrigin:"50% 50%"}},{fmt(T.GRAIN_PEEL)});',
    f'tl.fromTo("#gl1",{{opacity:0,y:14}},{{opacity:1,y:0,duration:0.2,ease:"power3.out"}},{fmt(T.GRAIN_PEEL + 0.25)});',
    f'tl.to("#gl1",{{opacity:0,y:-14,duration:0.15}},{fmt(T.GRAIN_STARCH - 0.05)});',
    f'tl.fromTo("#starchtxt",{{opacity:0,scale:1.6,transformOrigin:"50% 50%"}},{{opacity:1,scale:1,duration:0.2,ease:"power4.out"}},{fmt(T.GRAIN_STARCH)});',
    f'tl.fromTo("#gl2",{{opacity:0,y:14}},{{opacity:1,y:0,duration:0.2,ease:"power3.out"}},{fmt(T.GRAIN_STARCH + 0.05)});',
    f'tl.to("#graincard",{{y:-40,opacity:0,duration:0.18,ease:"power2.in"}},{fmt(g1 - 0.2)});',
]

# ---------- Dadi's points (shot 5) ----------
c0, c1 = T.COUNT[0] - 0.05, T.START["s05b"]
points = [ICON["chart"] + "<span class='hl'>High</span> glycaemic index", ICON["plate"] + "Low fibre = <span class='hl'>hungry sooner</span>",
          ICON["mountain"] + "<span class='hl'>Portion size</span> adds up", ICON["warn"] + "Type 2 diabetes <span class='hl'>risk ↑</span>"]
chips = "".join(f'<div class="chip" id="chip{n}"><span class="num">{n + 1}</span>{p}</div>' for n, p in enumerate(points))
els.append(f'''<div id="points" class="clip layer" data-start="{fmt(c0)}" data-duration="{fmt(c1 - c0)}" data-track-index="4">
  <div class="chips">{chips}<div class="src" id="src5">Source: BMJ 2012 meta-analysis (Hu et al.) · observational</div></div>
</div>''')
for n, t in enumerate(T.COUNT):
    anim.append(f'tl.fromTo("#chip{n}",{{x:-70,opacity:0}},{{x:0,opacity:1,duration:0.24,ease:"power3.out"}},{fmt(t)});')
anim.append(f'tl.fromTo("#src5",{{opacity:0}},{{opacity:1,duration:0.2}},{fmt(T.COUNT[3] + 0.2)});')
anim.append(f'tl.to("#points .chips",{{x:-80,opacity:0,duration:0.18,ease:"power2.in"}},{fmt(c1 - 0.2)});')

# ---------- rice facts (shots 7-9): letters fade in, top-right corner, clear of the hand ----------
rice = [
    ("brown", "#6e4318", "Brown rice", ["Whole grain: bran + germ kept", "~4× the magnesium of white"],
     "USDA FoodData Central"),
    ("red", "#a3271f", "Red rice", ["Palakkadan Matta, Kerala", "GI-tagged, parboiled grain"],
     "GI Registry of India"),
    ("black", "#4b2d63", "Black rice", ["Chak-Hao, Manipur (GI)", "Deep purple = anthocyanins"],
     "GI Registry · Govt. of Manipur"),
]


def chars(text):
    # letters animate one by one, but each word stays unbreakable so lines wrap only between words
    return " ".join('<span class="w">' + "".join('<span class="ch">%s</span>' % html.escape(c) for c in word) + "</span>"
                    for word in text.split(" "))


names = list(T.JARS)
for k, (key, col, title, lines, src) in enumerate(rice):
    t0 = T.JARS[key] + 0.1
    t1 = T.JARS[names[k + 1]] if k + 1 < len(names) else T.JARS_END
    rows = f'<div class="ftitle" style="color:{col}">{chars(title)}</div>' + \
        "".join(f'<div class="fline">{chars(l)}</div>' for l in lines) + f'<div class="fsrc">{chars("Source: " + src)}</div>'
    els.append(f'<div id="fact{k}" class="clip layer" data-start="{fmt(t0)}" data-duration="{fmt(t1 - t0)}" '
               f'data-track-index="4"><div class="facts" id="facts{k}">{rows}</div></div>')
    anim.append(f'tl.fromTo("#facts{k} .ch",{{opacity:0,y:10}},{{opacity:1,y:0,duration:0.22,ease:"power2.out",stagger:0.018}},{fmt(t0)});')
    anim.append(f'tl.to("#facts{k}",{{opacity:0,duration:0.22,ease:"power1.in"}},{fmt(t1 - 0.25)});')

# ---------- comment CTA (shot 12) ----------
r0, r1 = T.RICE_WORD - 0.25, T.START["s13"]
letters = "".join(f'<span class="ltr" id="ltr{j}">{c}</span>' for j, c in enumerate("RICE"))
els.append(f'''<div id="cta" class="clip layer" data-start="{fmt(r0)}" data-duration="{fmt(r1 - r0)}" data-track-index="4">
  <div class="cbox" id="cbox"><div class="avatar">{ICON["dadi"]}</div><div class="ctext">{letters}<span class="caret" id="caret"></span></div><div class="send">{ICON["send"]}</div></div>
</div>''')
anim += [
    f'tl.fromTo("#cbox",{{y:60,opacity:0}},{{y:0,opacity:1,duration:0.26,ease:"power3.out"}},{fmt(r0 + 0.1)});',
]
for j in range(4):
    anim.append(f'tl.fromTo("#ltr{j}",{{opacity:0}},{{opacity:1,duration:0.01}},{fmt(T.RICE_WORD + 0.15 + j * 0.11)});')

# ---------- scream (shot 13) ----------
s0 = T.EAR_GRAB
els.append(f'<div id="scream" class="clip layer" data-start="{fmt(s0)}" data-duration="{fmt(D - s0)}" data-track-index="4">'
           f'<div class="burst scream" id="screamtxt">AAAIIIEEE!!</div></div>')
anim.append(f'tl.fromTo("#screamtxt",{{scale:0.3,opacity:0,rotation:-10}},{{scale:1,opacity:1,rotation:-6,duration:0.16,ease:"power4.out"}},{fmt(s0)});')
for k in range(10):
    anim.append(f'tl.to("#screamtxt",{{x:{(-10 if k % 2 else 10)},duration:0.05}},{fmt(s0 + 0.16 + k * 0.05)});')
anim.append(f'tl.to("#screamtxt",{{x:0,duration:0.05}},{fmt(s0 + 0.66)});')

CSS = """
@font-face{font-family:Inter;font-weight:700;src:url(assets/fonts/inter-latin-700-normal.woff2) format("woff2")}
@font-face{font-family:Inter;font-weight:800;src:url(assets/fonts/inter-latin-800-normal.woff2) format("woff2")}
@font-face{font-family:Inter;font-weight:900;src:url(assets/fonts/inter-latin-900-normal.woff2) format("woff2")}
:root{--accent:#F5B82E;--teal:#0E7C74;--ink:#fff;--dark:#141414}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:#000}
#root{position:relative;width:1080px;height:1920px;overflow:hidden;font-family:Inter,sans-serif}
.shot{position:absolute;inset:0;width:1080px;height:1920px;object-fit:cover}
.layer{position:absolute;inset:0;pointer-events:none}
.hl{color:var(--accent)}
#hook{display:flex;flex-direction:column;align-items:center;padding-top:250px}
.hook-line{font-weight:900;font-size:120px;line-height:1.02;color:#fff;letter-spacing:-0.02em;
  -webkit-text-stroke:14px #000;paint-order:stroke fill;position:relative;isolation:isolate}
.hook-line.big{font-size:132px}
.ico{width:1em;height:1em;vertical-align:-0.12em;display:inline-block}
.hook-line .ico{width:120px;height:120px;vertical-align:-14px}
.chip .ico{width:62px;height:62px;margin-right:6px}
.rline .ico{width:44px;height:44px;vertical-align:-8px}
#finger .ico{width:84px;height:84px;vertical-align:-18px}
.avatar .ico{width:80px;height:80px}
.send .ico{width:52px;height:52px}
.grain-label .ico{width:56px;height:56px;vertical-align:-8px}
.hook-box{position:absolute;left:-22px;right:-22px;top:8px;bottom:4px;background:var(--teal);border-radius:18px;
  transform-origin:0 50%;z-index:-1}
.hook-txt{-webkit-text-stroke:0;color:#fff}
.cap{position:absolute;left:70px;right:70px;top:1300px;display:flex;justify-content:center}
.cap-in{font-weight:800;font-size:58px;line-height:1.18;text-align:center;color:#fff;word-spacing:0.16em;
  -webkit-text-stroke:12px #000;paint-order:stroke fill;max-width:900px}
.card{background:rgba(255,252,244,0.96);border-radius:34px;box-shadow:0 18px 50px rgba(0,0,0,0.28);color:var(--dark)}
.grain-card{position:absolute;left:0;right:0;top:40px;height:420px;text-align:center}
.grain-svg{width:520px;height:260px;display:block;margin:0 auto}
.grain-label{position:absolute;left:0;right:0;top:268px;font-weight:900;font-size:52px;opacity:0;color:#fff;-webkit-text-stroke:11px #000;paint-order:stroke fill}
.chip .hl,.rline .hl{color:#c4511f}
.grain-label .hl{color:var(--accent)}

.chips{position:absolute;left:60px;top:70px;display:flex;flex-direction:column;gap:14px}
.chip{display:flex;align-items:center;gap:20px;background:rgba(255,252,244,0.96);border-radius:999px;
  padding:16px 36px 16px 16px;font-weight:800;font-size:48px;color:var(--dark);box-shadow:0 10px 30px rgba(0,0,0,0.25);opacity:0}
.num{display:inline-flex;align-items:center;justify-content:center;width:68px;height:68px;border-radius:50%;
  background:var(--teal);color:#fff;font-weight:900;font-size:40px}
.src{font-weight:700;font-size:30px;color:#555;margin-top:6px}
.chips .src{color:#fff;-webkit-text-stroke:6px #000;paint-order:stroke fill;font-size:28px;opacity:0;padding-left:10px}
.rice-card{position:absolute;left:60px;right:60px;top:140px;display:flex;align-items:center;gap:26px;padding:34px 40px}
.rice-ico{width:190px;height:190px;flex:none}
.rtitle{font-weight:900;font-size:72px;letter-spacing:-0.02em;line-height:1}
.rline{font-weight:800;font-size:42px;line-height:1.25;margin-top:12px}
.facts{position:absolute;right:48px;top:150px;width:640px;text-align:right}
.facts .w{display:inline-block;white-space:nowrap}
.facts .ch{display:inline-block}
.ftitle{font-weight:900;font-size:76px;letter-spacing:-0.02em;line-height:1.05;margin-bottom:10px}
.fline{font-weight:800;font-size:40px;line-height:1.3;color:#2a1d12}
.fsrc{font-weight:700;font-size:28px;color:#6b5a48;margin-top:12px}
.grain-label{font-size:46px;line-height:1.2}
.burst{position:absolute;right:70px;top:300px;font-weight:900;font-size:120px;color:var(--accent);
  -webkit-text-stroke:16px #000;paint-order:stroke fill;transform-origin:50% 50%}
.scream{left:0;right:0;text-align:center;top:250px;font-size:128px}
.cta-head{position:absolute;left:0;right:0;top:230px;text-align:center;font-weight:900;font-size:84px;color:#fff;
  -webkit-text-stroke:14px #000;paint-order:stroke fill}
.cbox{position:absolute;left:430px;right:60px;top:1430px;height:120px;background:#fff;border-radius:999px;
  display:flex;align-items:center;padding:0 22px;gap:22px;box-shadow:0 14px 40px rgba(0,0,0,0.35)}
.avatar{width:80px;height:80px;border-radius:50%;background:#f1e3c4;display:flex;align-items:center;justify-content:center;font-size:48px}
.ctext{flex:1;font-weight:800;font-size:60px;color:#111;letter-spacing:0.04em;display:flex;align-items:center}
.ltr{opacity:0}
.caret{width:5px;height:60px;background:var(--teal);margin-left:6px}
.send{font-size:54px;color:var(--teal)}
"""

page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width={W}, height={H}"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<style>{CSS}</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{fmt(D)}" data-width="{W}" data-height="{H}" data-fps="{FPS}">
{chr(10).join(els)}
</div>
<script>
const tl = gsap.timeline({{ paused: true }});
{chr(10).join(anim)}
window.__timelines = window.__timelines || {{}};
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body>
</html>
"""
(HERE / "index.html").write_text(page, encoding="utf-8")
print("wrote index.html", D, "s,", len(els), "elements,", len(anim), "tweens")
