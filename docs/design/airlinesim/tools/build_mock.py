"""Throwaway mock of the SunProof supplier dashboard (AirlineSim style). Numbers are illustrative."""
import json, math, sys

geo = json.load(open(sys.argv[1]))
out = sys.argv[2]
K, MINX, MINY, S = geo["k"], geo["minx"], geo["miny"], geo["s"]
proj = lambda lat, lon: ((lon * K - MINX) * S, (-lat - MINY) * S)

ACTIVE = {"B", "IF", "CJ", "IS", "TM", "CT"}
paths = []
for c in geo["counties"]:
    on = c["code"] in ACTIVE
    paths.append(f'<path d="{c["d"]}" class="cty{" on" if on else ""}{" sel" if c["code"] in ("B", "IF") else ""}"/>')

CITIES = [
    ("București", 44.43, 26.10, {"grid": 1, "fault": 1, "eve": 4, "nodata": 1}, "lbl-r"),
    ("Cluj", 46.77, 23.59, {"eve": 3}, "lbl-r"),
    ("Iași", 47.16, 27.59, {"eve": 2}, "lbl-r"),
    ("Timișoara", 45.75, 21.23, {"nodata": 1}, "lbl-r"),
    ("Constanța", 44.18, 28.63, {"grid": 1, "eve": 1}, "lbl-l"),
]
COL = {"grid": "#8B7CFF", "fault": "#F0564A", "eve": "#F5B83D", "nodata": "#8A93A6"}
markers = []
for name, lat, lon, parts, side in CITIES:
    x, y = proj(lat, lon)
    n = sum(parts.values())
    R = 22
    C = 2 * math.pi * R
    segs, off = [], 0.0
    for kind in ("fault", "grid", "eve", "nodata"):
        v = parts.get(kind, 0)
        if not v:
            continue
        L = C * v / n
        gap = 2.5 if len(parts) > 1 else 0
        segs.append(f'<circle r="{R}" fill="none" stroke="{COL[kind]}" stroke-width="7" stroke-dasharray="{L - gap:.1f} {C - L + gap:.1f}" stroke-dashoffset="{-off:.1f}" transform="rotate(-90)"/>')
        off += L
    pulse = '<circle r="46" class="pulse"/>' if "grid" in parts else ""
    tx = 34 if side == "lbl-r" else -34
    anchor = "start" if side == "lbl-r" else "end"
    markers.append(
        f'<g transform="translate({x:.1f},{y:.1f})">{pulse}<circle r="{R}" fill="#0B0D12"/>{"".join(segs)}'
        f'<text class="mkn" y="7">{n}</text>'
        f'<text class="mkl" x="{tx}" y="8" text-anchor="{anchor}">{name}</text></g>'
    )

# yesterday's portfolio battery power (kW, + = discharge), 15-min steps, illustrative
def curve(scale_eve):
    pts = []
    for i in range(97):
        h = i / 4
        v = 0.0
        if 10 <= h <= 16:
            v -= 95 * math.sin(math.pi * (h - 10) / 6)
        if 18 <= h <= 23:
            v += scale_eve * 120 * math.sin(math.pi * (h - 18) / 5) ** 1.4
        if h < 6 or h > 23:
            v += 14
        v += 4 * math.sin(i * 1.7) + 3 * math.sin(i * 0.9)
        pts.append(v)
    return pts

def poly(vals, w=294, h=118, lo=-110, hi=150):
    return " ".join(f"{i * w / (len(vals) - 1):.1f},{h - (v - lo) / (hi - lo) * h:.1f}" for i, v in enumerate(vals))

actual, wanted = poly(curve(0.62)), poly(curve(1.0))
zero_y = 118 - (0 - -110) / 260 * 118
eve_x0, eve_x1 = 19 / 24 * 294, 21 / 24 * 294

price = [62, 58, 55, 54, 56, 64, 82, 96, 88, 70, 52, 40, 34, 31, 33, 41, 60, 92, 140, 196, 228, 214, 160, 104]
pmax = max(price)
spark = " ".join(f"{i * 136 / 23:.1f},{44 - p / pmax * 40:.1f}" for i, p in enumerate(price))

def arc(a0, a1, r):
    # hours to angle, 0h at top, clockwise
    t0, t1 = (a0 / 24) * 2 * math.pi, (a1 / 24) * 2 * math.pi
    x0, y0 = r * math.sin(t0), -r * math.cos(t0)
    x1, y1 = r * math.sin(t1), -r * math.cos(t1)
    large = 1 if (a1 - a0) > 12 else 0
    return f"M{x0:.1f},{y0:.1f} A{r},{r} 0 {large} 1 {x1:.1f},{y1:.1f}"

hand_t = (12 + 40 / 60) / 24 * 2 * math.pi
hx, hy = 46 * math.sin(hand_t), -46 * math.cos(hand_t)
ticks = "".join(
    f'<line x1="{58 * math.sin(h / 24 * 2 * math.pi):.1f}" y1="{-58 * math.cos(h / 24 * 2 * math.pi):.1f}" '
    f'x2="{(52 if h % 6 else 49) * math.sin(h / 24 * 2 * math.pi):.1f}" y2="{-(52 if h % 6 else 49) * math.cos(h / 24 * 2 * math.pi):.1f}" class="tick"/>'
    for h in range(24)
)

ICON = lambda d: f'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">{d}</svg>'
I_HOME = ICON('<path d="M3.5 11 12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/>')
I_TK = ICON('<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 10h8M8 14h5"/>')
I_BAT = ICON('<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10.5v3M7 10v4M11 10v4"/>')
I_BILL = ICON('<path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>')
I_GRID = ICON('<path d="M12 3v18M7 7h10M5 12h14M8 21l4-9 4 9"/>')
I_IN = ICON('<path d="M4 13l2.5-7h11L20 13v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>')
I_REP = ICON('<path d="M6 20V10M12 20V4M18 20v-7"/>')
I_SR = ICON('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>')

css = """
*{box-sizing:border-box;margin:0;padding:0}
body{width:1440px;height:900px;background:#0B0D12;color:#E8EBF2;font-family:Inter,sans-serif;font-size:13px;overflow:hidden;font-feature-settings:"tnum" 1}
.side{position:absolute;left:0;top:0;bottom:0;width:220px;background:#10131A;border-right:1px solid #222836;padding:18px 14px;display:flex;flex-direction:column;gap:6px}
.logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:17px;letter-spacing:-.01em;padding:2px 6px 12px}
.logo .dot{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#F5B83D,#2F6BFF);display:grid;place-items:center}
.sup{display:flex;align-items:center;gap:10px;background:#171B25;border:1px solid #252B38;border-radius:10px;padding:9px 10px;margin-bottom:10px}
.sup .b{width:22px;height:22px;border-radius:6px;background:#0E9F6E;font-size:11px;font-weight:700;display:grid;place-items:center;color:#fff}
.sup small{display:block;color:#6B7385;font-size:11px}
.nav{display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:9px;color:#A3ABBD;font-weight:500;font-size:13.5px}
.nav.act{background:#2F6BFF;color:#fff}
.nav .c{margin-left:auto;min-width:20px;height:20px;border-radius:6px;font-size:11px;font-weight:600;display:grid;place-items:center;padding:0 5px}
.c.r{background:#F0564A;color:#fff}.c.a{background:#5a4512;color:#F5B83D}.c.v{background:#2c2660;color:#B9AFFF}.c.cy{background:#0d3a4d;color:#7dd3fc}.c.n{background:#232a38;color:#A3ABBD}
.scen{margin-top:auto;background:#151923;border:1px solid #252B38;border-radius:10px;padding:10px 12px;display:flex;gap:10px;align-items:center}
.scen .g{width:30px;height:30px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#FCD34D,#B7791F)}
.scen b{font-size:12.5px;font-weight:600;display:block}.scen small{color:#6B7385;font-size:11px}
.top{position:absolute;left:220px;right:0;top:0;height:62px;display:flex;align-items:center;gap:10px;padding:0 22px;border-bottom:1px solid #1C2130;background:rgba(11,13,18,.7)}
.arw{color:#6B7385;font-size:16px;letter-spacing:8px}
.search{display:flex;align-items:center;gap:8px;color:#6B7385;width:300px;font-size:13px}
.chip{display:flex;align-items:center;gap:8px;height:34px;padding:0 12px;border-radius:9px;font-weight:600;font-size:12.5px;white-space:nowrap}
.zone{background:#141A2A;border:1px solid #26304a;color:#C9D3EA}
.money{background:rgba(47,191,113,.13);color:#5BE39A}
.must{background:rgba(240,86,74,.15);color:#FF8A80}
.must i{font-style:normal;background:#F0564A;color:#fff;border-radius:5px;padding:1px 6px;font-size:11px}
.clock{margin-left:6px;line-height:1.15}.clock b{font-size:14px}.clock small{display:block;color:#6B7385;font-size:11px;font-weight:500}
.play{width:28px;height:28px;border-radius:50%;border:1px solid #2a3142;display:grid;place-items:center;color:#A3ABBD;font-size:10px}
.role{color:#A3ABBD;font-weight:500}
.av{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#334155,#64748b);margin-left:4px}
.main{position:absolute;left:220px;top:62px;right:0;bottom:0}
.map{position:absolute;left:340px;top:168px;width:556px}
.cty{fill:#161D2A;stroke:#2A3344;stroke-width:1}
.cty.on{fill:#1C4570;stroke:#33639a}
.cty.sel{fill:#2A6CB0;stroke:#5c95d6}
.mk{stroke-width:5;fill:#0B0D12}
.mk.grid{stroke:#8B7CFF}.mk.eve{stroke:#F5B83D}.mk.nodata{stroke:#8A93A6}.mk.fault{stroke:#F0564A}
.pulse{fill:rgba(139,124,255,.16);stroke:rgba(139,124,255,.45);stroke-width:1}
.mkn{fill:#fff;font-size:21px;font-weight:700;text-anchor:middle}
.mkl{fill:#E8EBF2;font-size:24px;font-weight:600;paint-order:stroke;stroke:#0B0D12;stroke-width:6px}
.verdict{position:absolute;left:362px;width:512px;top:20px;text-align:center}
.verdict h1{font-size:19px;line-height:1.3;font-weight:600;letter-spacing:-.015em}
.verdict p{color:#A3ABBD;margin-top:6px;font-size:13px}
.verdict .pill{display:inline-flex;gap:14px;margin-top:12px;background:#121722;border:1px solid #252B38;border-radius:999px;padding:7px 14px;font-size:12px;color:#A3ABBD}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:0}
.tip{position:absolute;left:452px;top:520px;width:236px;background:#151A25;border:1px solid #2E3850;border-radius:12px;padding:12px 14px;box-shadow:0 18px 40px -12px rgba(0,0,0,.7)}
.tip b{font-size:13.5px}.tip small{display:block;color:#6B7385;margin:2px 0 8px;font-size:11.5px}
.tip div{display:flex;justify-content:space-between;color:#A3ABBD;font-size:12px;padding:3px 0}.tip div span:last-child{color:#E8EBF2;font-weight:600}
.w{position:absolute;background:rgba(20,24,33,.92);border:1px solid #232A38;border-radius:12px;padding:14px 16px}
.wh{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px;margin-bottom:10px}
.wh .ic{width:22px;height:22px;border-radius:6px;display:grid;place-items:center;font-size:12px}
.wh .more{margin-left:auto;color:#6B7385;font-weight:500;font-size:12px}
.sel2{color:#A3ABBD;font-size:11.5px;border:1px solid #2a3142;border-radius:7px;padding:3px 8px;font-weight:500}
.kp{display:flex;gap:0;margin-top:10px;border-top:1px solid #232A38;padding-top:10px}
.kp div{flex:1;border-left:2px solid #2a3142;padding-left:9px}
.kp small{display:block;color:#6B7385;font-size:11px}.kp b{font-size:17px;font-weight:600}
.kp .g{border-color:#2FBF71}.kp .y{border-color:#F5B83D}.kp .r{border-color:#F0564A}
.rt{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;margin:0 -6px}
.rt.hi{background:linear-gradient(90deg,rgba(139,124,255,.22),rgba(139,124,255,.04));box-shadow:inset 3px 0 0 #8B7CFF}
.rt .a{width:122px}.rt .a b,.rt .z b{display:block;font-size:13px}.rt .z .tag{margin-top:3px}.rt .a small,.rt .z small{color:#6B7385;font-size:11px}
.rt .sw{color:#6B7385;font-size:15px}.rt .z{flex:1}.rt .t{color:#6B7385;font-size:11.5px;text-align:right}
.tag{display:inline-block;font-size:10.5px;font-weight:600;border-radius:5px;padding:1px 6px;margin-top:2px}
.tg-v{background:#2c2660;color:#B9AFFF}.tg-r{background:#4a1d1a;color:#FF8A80}.tg-c{background:#0d3a4d;color:#7dd3fc}.tg-a{background:#4a3a10;color:#F5B83D}
.ib{display:flex;gap:10px;padding:7px 0;border-top:1px solid #1F2532}.ib:first-of-type{border-top:0}
.ib .p{width:28px;height:28px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:11px;font-weight:700}
.ib b{font-size:12.5px;display:block}.ib span{color:#A3ABBD;font-size:11.5px}.ib small{margin-left:auto;color:#6B7385;font-size:11px;white-space:nowrap}
.dl{display:flex;gap:12px;padding:7px 0;border-top:1px solid #1F2532}.dl:first-of-type{border-top:0}
.dl .d{width:58px;flex:none;color:#F5B83D;font-weight:600;font-size:12px}.dl span{font-size:12px;color:#C9D0DE;line-height:1.35}.dl small{display:block;color:#6B7385;font-size:10.5px;margin-top:1px}
.toast{position:absolute;right:20px;bottom:20px;width:330px;border-radius:12px;padding:13px 14px 13px 16px;background:linear-gradient(120deg,#4B3FD1 0%,#2a2380 55%,#1a1747 100%);border:1px solid #6d62ff;box-shadow:0 20px 40px -14px rgba(60,40,200,.55);display:flex;gap:12px}
.toast .ti{width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,.14);display:grid;place-items:center;flex:none}
.toast b{font-size:14px;display:block}.toast p{font-size:12px;color:#d9d5ff;margin-top:3px;line-height:1.4}
.toast .btn{display:inline-block;margin-top:8px;background:#fff;color:#2a2380;font-weight:600;font-size:12px;border-radius:7px;padding:5px 10px}
.toast .x{position:absolute;right:10px;top:8px;color:#b9b2ff;font-size:13px}
.radar{position:absolute;left:438px;bottom:24px;display:flex;align-items:center;gap:10px;background:#121722;border:1px solid #252B38;border-radius:999px;padding:6px 14px 6px 8px;font-size:12.5px;color:#C9D0DE}
.sw2{width:34px;height:20px;border-radius:999px;background:#2a3142;position:relative}.sw2:after{content:"";position:absolute;left:3px;top:3px;width:14px;height:14px;border-radius:50%;background:#A3ABBD}
.help{position:absolute;left:760px;bottom:26px;width:32px;height:32px;border-radius:50%;background:#2F6BFF;display:grid;place-items:center;font-weight:700}
.demo{position:absolute;left:360px;bottom:4px;color:#4b5263;font-size:10.5px}
"""

html = f"""<!doctype html><html lang="ro"><head><meta charset="utf-8"><style>{css}</style></head><body>
<aside class="side">
  <div class="logo"><span class="dot">{ICON('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/>')}</span>SunProof</div>
  <div class="sup"><span class="b">FD</span><div><b style="font-size:13px">Furnizor Demo</b><small>330 de case, cu acord</small></div><span style="margin-left:auto;color:#6B7385">↕</span></div>
  <div class="nav act">{I_HOME}Panou</div>
  <div class="nav">{I_TK}De rezolvat<span class="c r">16</span></div>
  <div class="nav">{I_BAT}Baterii<span class="c a">10</span></div>
  <div class="nav">{I_BILL}Facturi<span class="c cy">3</span></div>
  <div class="nav">{I_GRID}Rețea<span class="c v">2</span></div>
  <div class="nav">{I_IN}Inbox<span class="c n">4</span></div>
  <div class="nav">{I_REP}Rapoarte</div>
  <div class="scen"><span class="g"></span><div><b>15 iulie 2026</b><small>scenariu demo · date simulate</small></div><span style="margin-left:auto;color:#6B7385">↕</span></div>
</aside>
<header class="top">
  <span class="arw">←→</span>
  <span class="search">{I_SR}Caută client, loc de consum, post…</span>
  <span class="chip zone">◎ Toată țara ▾</span>
  <span style="flex:1"></span>
  <span class="chip money">● Seara din baterii, ieri: 286 kWh ↗</span>
  <span class="chip must">De răspuns <i>3</i></span>
  <span class="play">▶</span>
  <span class="clock"><b>12:40</b><small>15 iul. 2026</small></span>
  <span class="chip role">Vedere: toate ▾</span>
  <span class="av"></span>
</header>
<main class="main">
  <div class="verdict"><h1>Azi: 2 posturi cu supratensiune, 1 defect,<br>10 baterii setate altfel decât vor clienții</h1>
    <p>330 de case monitorizate în 5 orașe · ultima verificare acum 4 min</p>
    <div class="pill"><span><i class="dot" style="background:#8B7CFF"></i>rețea</span><span><i class="dot" style="background:#F0564A"></i>echipament</span><span><i class="dot" style="background:#F5B83D"></i>baterie</span><span><i class="dot" style="background:#8A93A6"></i>lipsă date</span></div></div>
  <svg class="map" viewBox="0 0 1000 703">{''.join(paths)}{''.join(markers)}</svg>
  <div class="tip"><b>București și Ilfov</b><small>Rețele Electrice Muntenia Sud</small>
    <div><span>Case monitorizate</span><span>66</span></div><div><span>Posturi cu supratensiune</span><span style="color:#B9AFFF">1</span></div>
    <div><span>Defecte de echipament</span><span style="color:#FF8A80">1</span></div><div><span>Baterii setate greșit</span><span style="color:#F5B83D">4</span></div><div><span>Fără date</span><span style="color:#A3ABBD">1</span></div><p style="color:#7db0ff;font-size:12px;font-weight:600;margin-top:6px">Clic pentru zonă ›</p></div>

  <section class="w" style="left:20px;top:20px;width:328px">
    <div class="wh"><span class="ic" style="background:#4a3a10;color:#F5B83D">☾</span>Seara de ieri<span class="more"><span class="sel2">Ieri ▾</span></span></div>
    <svg width="294" height="132" viewBox="0 0 294 132" style="overflow:visible">
      <rect x="{eve_x0:.1f}" y="0" width="{eve_x1 - eve_x0:.1f}" height="118" fill="rgba(245,184,61,.10)"/>
      <line x1="0" x2="294" y1="{zero_y:.1f}" y2="{zero_y:.1f}" stroke="#2a3142"/>
      <polyline points="{wanted}" fill="none" stroke="#5B8CFF" stroke-width="1.6" stroke-dasharray="4 3"/>
      <polyline points="{actual}" fill="none" stroke="#F5B83D" stroke-width="2"/>
      <text x="0" y="131" fill="#6B7385" font-size="10">00</text><text x="72" y="131" fill="#6B7385" font-size="10">06</text><text x="143" y="131" fill="#6B7385" font-size="10">12</text><text x="{eve_x0 - 6:.0f}" y="131" fill="#F5B83D" font-size="10">19–21</text><text x="282" y="131" fill="#6B7385" font-size="10">24</text>
    </svg>
    <div style="display:flex;gap:14px;font-size:11px;color:#A3ABBD;margin-top:4px"><span><i class="dot" style="background:#F5B83D"></i>livrat de baterii</span><span><i class="dot" style="background:#5B8CFF"></i>dacă erau setate cum vor clienții</span></div>
    <div class="kp"><div class="g"><small>Livrat 19–21</small><b>286 kWh</b></div><div class="y"><small>Rămas în baterii</small><b>154 kWh</b></div><div class="r"><small>Ratat (demo)</small><b>62 lei</b></div></div>
  </section>

  <section class="w" style="left:20px;top:304px;width:328px">
    <div class="wh"><span class="ic" style="background:#2c2660;color:#B9AFFF">⇄</span>Unde au plecat problemele azi<span class="more">⋮</span></div>
    <div class="rt hi"><div class="a"><b>PT 2041</b><small>3 case · 12:40</small></div><span class="sw">⇄</span><div class="z"><b>Distribuitorul</b><span class="tag tg-v">sesizare cu dosar</span></div></div>
    <div class="rt"><div class="a"><b>B5</b><small>PT 1187 · 11:20</small></div><span class="sw">⇄</span><div class="z"><b>O&amp;M partener</b><span class="tag tg-r">deplasare</span></div></div>
    <div class="rt"><div class="a"><b>C-1043</b><small>Cluj · 10:05</small></div><span class="sw">⇄</span><div class="z"><b>Call center</b><span class="tag tg-c">factură explicată</span></div></div>
    <div class="rt"><div class="a"><b>A10</b><small>PT 2041 · 09:30</small></div><span class="sw">⇄</span><div class="z"><b>Clientul</b><span class="tag tg-a">pașii pentru baterie</span></div></div>
  </section>

  <section class="w" style="left:20px;top:596px;width:158px;height:150px">
    <div class="wh" style="font-size:13px;margin-bottom:4px">Prețul orei</div>
    <div style="color:#6B7385;font-size:10.5px">curbă ilustrativă</div>
    <svg width="136" height="48" viewBox="0 0 136 48" style="margin-top:8px"><polyline points="{spark}" fill="none" stroke="#2FBF71" stroke-width="1.8"/></svg>
    <div style="font-size:12px;margin-top:4px">Seara: până la <b>8×</b> intervalul de amiază</div>
  </section>
  <section class="w" style="left:190px;top:596px;width:158px;height:150px">
    <div class="wh" style="font-size:13px;margin-bottom:6px">Soarele acum</div>
    <div style="display:flex;align-items:baseline;gap:8px"><b style="font-size:30px;font-weight:600">31°</b><span style="color:#F5B83D">☀ senin</span></div>
    <div style="color:#A3ABBD;font-size:11.5px;margin-top:4px">București · producție 96% din așteptat</div>
    <div style="color:#6B7385;font-size:10.5px;margin-top:8px">norii nu explică opririle de azi</div>
  </section>

  <section class="w" style="right:20px;top:20px;width:312px">
    <div class="wh"><span class="ic" style="background:#13304f;color:#7db0ff">◔</span>Ziua în ferestre<span class="more">⋮</span></div>
    <div style="display:flex;gap:16px;align-items:center">
      <svg width="132" height="132" viewBox="-66 -66 132 132">
        <circle r="58" fill="#10141c" stroke="#2a3142"/>{ticks}
        <path d="{arc(11, 16, 40)}" stroke="#2FBF71" stroke-width="8" fill="none" stroke-linecap="round"/>
        <path d="{arc(12, 15, 30)}" stroke="#8B7CFF" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="{arc(19, 21, 40)}" stroke="#F5B83D" stroke-width="8" fill="none" stroke-linecap="round"/>
        <text x="0" y="-38" fill="#6B7385" font-size="9" text-anchor="middle">0</text><text x="40" y="3" fill="#6B7385" font-size="9" text-anchor="middle">6</text><text x="0" y="44" fill="#6B7385" font-size="9" text-anchor="middle">12</text><text x="-40" y="3" fill="#6B7385" font-size="9" text-anchor="middle">18</text><line x1="0" y1="0" x2="{hx:.1f}" y2="{hy:.1f}" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle r="4" fill="#fff"/>
      </svg>
      <div style="font-size:12px;line-height:1.7;color:#A3ABBD"><div><i class="dot" style="background:#2FBF71"></i>încărcare 11–16</div><div><i class="dot" style="background:#8B7CFF"></i>risc de supratensiune</div><div><i class="dot" style="background:#F5B83D"></i>seara 19–21</div><div style="color:#E8EBF2;margin-top:6px;font-weight:600">Seara începe în 6 h 20 min</div></div>
    </div>
  </section>

  <section class="w" style="right:20px;top:240px;width:312px">
    <div class="wh"><span class="ic" style="background:#13304f;color:#7db0ff">✉</span>Inbox <span class="c r" style="height:18px;border-radius:5px;padding:0 6px;font-size:11px">4</span><span class="more">⋮</span></div>
    <div class="ib"><span class="p" style="background:#2c2660;color:#B9AFFF">RE</span><div><b>Rețele Electrice Muntenia Sud</b><span>Sesizarea PT 2041, înregistrată</span></div><small>12:52</small></div>
    <div class="ib"><span class="p" style="background:#4a1d1a;color:#FF8A80">OM</span><div><b>O&amp;M partener</b><span>B5: tehnician alocat, mâine 9:00</span></div><small>11:41</small></div>
    <div class="ib"><span class="p" style="background:#0d3a4d;color:#7dd3fc">CC</span><div><b>Call center</b><span>2 clienți: factura din august</span></div><small>10:05</small></div>
  </section>

  <section class="w" style="right:20px;top:470px;width:312px">
    <div class="wh"><span class="ic" style="background:#3a2f12;color:#F5B83D">⏲</span>Termene<span class="more">surse ›</span></div>
    <div class="dl"><span class="d">1 nov.</span><span>Acte adiționale pentru Legea 160<small>proiect ANRE, în consultare</small></span></div>
    <div class="dl"><span class="d">31 dec.</span><span>Facturarea lunară adaptată în IT<small>proiect ANRE, în consultare</small></span></div>
    <div class="dl"><span class="d">trimestrial</span><span>Indicele reclamațiilor (IGP)<small>Ordinul ANRE 61/2026</small></span></div>
  </section>

  <div class="radar">{I_SR}Clic pe un județ sau caută un oraș</div>
  <div class="help">?</div>
  <div class="toast"><span class="ti">{ICON('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>')}</span><div><b>Supratensiune pe PT 2041</b><p>A10, A11 și A12 s-au oprit la 12:40, la 254,1 V. Rețea, nu echipament: nu trimitem pe nimeni.</p><span class="btn">Trimite la distribuitor ›</span></div><span class="x">✕</span></div>
  <div class="demo">Schiță · cifre ilustrative · date simulate</div>
</main>
</body></html>"""
open(out, "w").write(html)
print("ok", len(html))
