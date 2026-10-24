"""Throwaway mock: supplier dashboard after picking a county (București și Ilfov). Numbers illustrative."""
import json, runpy, sys
S = "/tmp/claude-0/-home-claude-innovation-labs-project/fa455412-be3a-5fa1-ae39-c0283ac8c7ba/scratchpad"
sys.argv = ["x", f"{S}/ro_0.8.json", f"{S}/mock/_tmp.html"]
g = runpy.run_path(f"{S}/tools/build_mock.py")
css, base, ICON = g["css"], g["html"], g["ICON"]
shell = base.split('<main class="main">')[0]
shell = shell.replace('◎ Toată țara ▾', '◎ București și Ilfov ▾').replace('<span class="chip role">Vedere: toate ▾</span>', '')
shell = shell.replace('<span class="c r">16</span>', '<span class="c r">7</span>').replace('<span class="c a">10</span>', '<span class="c a">4</span>').replace('<span class="c v">2</span>', '<span class="c v">1</span>')

geo = json.load(open(f"{S}/ro_0.1.json"))
K, MINX, MINY, SC = geo["k"], geo["minx"], geo["miny"], geo["s"]
proj = lambda lat, lon: ((lon * K - MINX) * SC, (-lat - MINY) * SC)
paths = []
for c in geo["counties"]:
    cls = "cz sel" if c["code"] in ("B", "IF") else "cz"
    paths.append(f'<path d="{c["d"]}" class="{cls}"/>')
# neighbour labels
NB = [("Prahova", 44.80, 26.05), ("Ialomița", 44.62, 26.62), ("Călărași", 44.25, 26.52), ("Giurgiu", 44.12, 25.95), ("Dâmbovița", 44.60, 25.55)]
COL = {"grid": "#8B7CFF", "fault": "#F0564A", "eve": "#F5B83D", "nodata": "#8A93A6", "ok": "#2FBF71"}
POSTS = [
    ("PT 2041", 44.465, 26.065, "grid", "12 case · 3 oprite", "l"),
    ("PT 1187", 44.400, 26.110, "fault", "9 case · B5 oprită", "r"),
    ("PT 0932", 44.440, 26.120, "eve", "1 baterie", "r"),
    ("PT 1510", 44.418, 26.035, "eve", "1 baterie", "l"),
    ("PT 3307", 44.500, 26.240, "eve", "Voluntari · 1 baterie", "r"),
    ("PT 3120", 44.630, 26.080, "eve", "Otopeni · 1 baterie", "r"),
    ("PT 2875", 44.360, 26.190, "nodata", "Popești-Leordeni · fără date", "r"),
    (None, 44.445, 26.020, "ok", "", ""), (None, 44.475, 26.130, "ok", "", ""), (None, 44.385, 26.090, "ok", "", ""),
    (None, 44.430, 26.165, "ok", "", ""), (None, 44.520, 26.010, "ok", "", ""), (None, 44.360, 26.030, "ok", "", ""), (None, 44.560, 25.950, "ok", "", ""), (None, 44.400, 26.270, "ok", "", ""),
]
mk = []
for name, lat, lon, kind, sub, side in POSTS:
    x, y = proj(lat, lon)
    if kind == "ok":
        mk.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="0.5" fill="{COL[kind]}" opacity=".8"/>')
        continue
    sel = name == "PT 2041"
    if sel:
        mk.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="2.6" fill="rgba(139,124,255,.18)" stroke="rgba(139,124,255,.6)" stroke-width=".15"/>')
    mk.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="0.95" fill="#0B0D12" stroke="{COL[kind]}" stroke-width=".55"/>')
    tx = x + 1.6 if side == "r" else x - 1.6
    an = "start" if side == "r" else "end"
    mk.append(f'<text x="{tx:.2f}" y="{y - 0.2:.2f}" text-anchor="{an}" class="pl">{name}</text>'
              f'<text x="{tx:.2f}" y="{y + 1.55:.2f}" text-anchor="{an}" class="ps">{sub}</text>')
nbl = "".join(f'<text x="{proj(a, b)[0]:.1f}" y="{proj(a, b)[1]:.1f}" class="nb">{n}</text>' for n, a, b in NB)
bx, by = proj(44.563, 26.10)
city = f'<text x="{bx:.1f}" y="{by:.1f}" class="cl">BUCUREȘTI</text>'
ifx, ify = proj(44.60, 26.30)
city += f'<text x="{ifx:.1f}" y="{ify:.1f}" class="cl" >ILFOV</text>'

# street strip for PT 2041: houses from post to end of line, voltage at 12:40
H = [("A1", 239.8, "on"), ("A2", 241.0, "on"), ("A3", 243.2, "on"), ("A4", 244.9, "on"), ("A5", 246.7, "on"), ("A6", 248.6, "on"),
     ("A7", 0, "nodata"), ("A8", 250.9, "on"), ("A9", 252.4, "on"), ("A10", 254.1, "off"), ("A11", 254.1, "off"), ("A12", 254.0, "off")]
def hc(v, st):
    if st == "off": return "#8B7CFF"
    if st == "nodata": return "#8A93A6"
    return "#2FBF71" if v < 248 else ("#F5B83D" if v < 253 else "#F0564A")
strip = []
x0, step = 34, 21.5
for i, (hid, v, st) in enumerate(H):
    x = x0 + i * step
    c = hc(v, st)
    if st == "off":
        strip.append(f'<rect x="{x - 7}" y="18" width="14" height="14" rx="3" fill="#0B0D12" stroke="{c}" stroke-width="2.4"/>')
    else:
        strip.append(f'<rect x="{x - 7}" y="18" width="14" height="14" rx="3" fill="{c}"/>')
    strip.append(f'<text x="{x}" y="46" class="sl">{hid[1:]}</text>')
xthr = x0 + 8.6 * step
strip_svg = (f'<svg width="290" height="74" viewBox="0 0 290 74">'
             f'<line x1="14" y1="25" x2="{x0 + 11 * step + 10}" y2="25" stroke="#2a3142" stroke-width="2"/>'
             f'<rect x="2" y="15" width="20" height="20" rx="5" fill="#1C4570" stroke="#5b8fd0" stroke-width="1.5"/><text x="12" y="28.5" class="pt">PT</text>'
             f'{"".join(strip)}'
             f'<line x1="{xthr:.1f}" y1="6" x2="{xthr:.1f}" y2="52" stroke="#F0564A" stroke-width="1.6" stroke-dasharray="4 3"/>'
             f'<text x="{xthr - 4:.1f}" y="10" class="thr" text-anchor="end">253 V</text>'
             f'<text x="14" y="68" class="ax">postul</text><text x="{x0 + 11 * step + 8}" y="68" class="ax" text-anchor="end">capătul liniei, ~420 m</text></svg>')

css2 = css + """
.crumb{position:absolute;left:362px;top:22px;color:#6B7385;font-size:12.5px}.crumb b{color:#E8EBF2;font-weight:600}
.verdict{top:44px}
.cz{fill:#141A26;stroke:#2A3344;stroke-width:1;vector-effect:non-scaling-stroke}
.cz.sel{fill:#1C4570;stroke:#5c95d6;stroke-width:1.6}
.pl{fill:#E8EBF2;font-size:1.55px;font-weight:600;paint-order:stroke;stroke:#0B0D12;stroke-width:.4px}
.ps{fill:#A3ABBD;font-size:1.2px;paint-order:stroke;stroke:#0B0D12;stroke-width:.35px}
.nb{fill:#4b5568;font-size:1.7px;font-weight:600;text-anchor:middle;letter-spacing:.05px}
.cl{fill:#7fa6d6;font-size:2px;font-weight:700;text-anchor:middle;letter-spacing:.4px;opacity:.75}
.zmap{position:absolute;left:376px;top:150px;-webkit-mask-image:radial-gradient(closest-side,#000 70%,transparent 100%);mask-image:radial-gradient(closest-side,#000 72%,transparent 100%)}
.rc{position:absolute;right:20px;top:20px;width:340px;display:flex;flex-direction:column;gap:14px}.rc .w{position:static}
.lc{position:absolute;left:20px;top:20px;width:328px;display:flex;flex-direction:column;gap:14px}.lc .w{position:static}
.zl{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;margin:0 -6px;color:#C9D0DE;font-size:13px}
.zl.act{background:linear-gradient(90deg,rgba(47,107,255,.28),rgba(47,107,255,.05));box-shadow:inset 3px 0 0 #2F6BFF;color:#fff;font-weight:600}
.zl small{color:#6B7385;font-size:11px;font-weight:400}.zl .n{margin-left:auto;display:flex;gap:4px}
.zl .n i{font-style:normal;font-size:10.5px;font-weight:600;border-radius:5px;padding:1px 6px}
.srch{display:flex;align-items:center;gap:8px;border:1px solid #2a3142;background:#0f131b;border-radius:9px;padding:8px 10px;color:#6B7385;margin-bottom:8px;font-size:12.5px}
.pr{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid #1F2532}.pr:first-of-type{border-top:0}
.pr .k{width:9px;height:9px;border-radius:50%;margin-top:5px;flex:none}
.pr b{font-size:13px;display:block}.pr span{color:#A3ABBD;font-size:11.5px;display:block;margin-top:1px}
.pr .btn{margin-left:auto;white-space:nowrap;font-size:11.5px;font-weight:600;border-radius:7px;padding:5px 9px;border:1px solid #2E3850;color:#C9D0DE;align-self:center}
.pr .btn.v{background:#6d62ff;border-color:#6d62ff;color:#fff}
.sl{fill:#A3ABBD;font-size:10px;text-anchor:middle}.pt{fill:#fff;font-size:8.5px;font-weight:700;text-anchor:middle}
.thr{fill:#FF8A80;font-size:10.5px;font-weight:600}.ax{fill:#6B7385;font-size:10px}
.back{position:absolute;left:372px;bottom:24px;display:flex;gap:8px}
.back span{background:#121722;border:1px solid #252B38;border-radius:999px;padding:7px 14px;font-size:12.5px;color:#C9D0DE}
"""
VB = "594 530 68 92"
main = f"""<main class="main">
  <div class="crumb">România › <b>București și Ilfov</b></div>
  <div class="verdict"><h1>București și Ilfov: 1 post cu supratensiune,<br>1 defect, 4 baterii setate altfel decât vor clienții</h1>
    <p>66 de case monitorizate · Rețele Electrice Muntenia Sud</p></div>
  <svg class="zmap" width="470" height="636" viewBox="{VB}">{''.join(paths)}{nbl}{city}{''.join(mk)}</svg>

  <div class="lc"><section class="w">
    <div class="wh"><span class="ic" style="background:#13304f;color:#7db0ff">◎</span>Alege zona<span class="more">5 orașe</span></div>
    <div class="srch">{g['I_SR']}Caută județ, oraș sau post…</div>
    <div class="zl">Toată țara<span class="n"><i style="background:#232a38;color:#A3ABBD">15</i></span></div>
    <div class="zl act"><div>București și Ilfov<br><small>Rețele Electrice Muntenia Sud</small></div><span class="n"><i style="background:#2c2660;color:#B9AFFF">1</i><i style="background:#4a1d1a;color:#FF8A80">1</i><i style="background:#4a3a10;color:#F5B83D">4</i><i style="background:#232a38;color:#A3ABBD">1</i></span></div>
    <div class="zl"><div>Cluj<br><small>Distribuție Energie Electrică Transilvania Nord</small></div><span class="n"><i style="background:#4a3a10;color:#F5B83D">3</i></span></div>
    <div class="zl"><div>Constanța<br><small>Distribuție Energie Electrică Dobrogea</small></div><span class="n"><i style="background:#2c2660;color:#B9AFFF">1</i><i style="background:#4a3a10;color:#F5B83D">1</i></span></div>
    <div class="zl"><div>Iași<br><small>Delgaz Grid</small></div><span class="n"><i style="background:#4a3a10;color:#F5B83D">2</i></span></div>
    <div class="zl"><div>Timiș<br><small>Distribuție Energie Electrică Banat</small></div><span class="n"><i style="background:#232a38;color:#A3ABBD">1</i></span></div>
  </section>

  <section class="w">
    <div class="wh"><span class="ic" style="background:#4a3a10;color:#F5B83D">☾</span>Seara de ieri în zonă</div>
    <div class="kp" style="border-top:0;padding-top:0;margin-top:0"><div class="g"><small>Livrat 19–21</small><b>58 kWh</b></div><div class="y"><small>Rămas în baterii</small><b>31 kWh</b></div><div class="r"><small>Ratat (demo)</small><b>12 lei</b></div></div>
  </section></div>

  <div class="rc"><section class="w">
    <div class="wh"><span class="ic" style="background:#2c2660;color:#B9AFFF">⚑</span>De rezolvat în zonă<span class="more">toate 7 ›</span></div>
    <div class="pr"><span class="k" style="background:#8B7CFF"></span><div><b>PT 2041 · supratensiune</b><span>3 case oprite la 12:40, 254,1 V · rețea</span></div><span class="btn v">Trimite la distribuitor</span></div>
    <div class="pr"><span class="k" style="background:#F0564A"></span><div><b>B5 · PT 1187 · defect</b><span>singura oprită de pe post, tensiune normală</span></div><span class="btn">Trimite tehnicianul</span></div>
    <div class="pr"><span class="k" style="background:#F5B83D"></span><div><b>4 baterii setate greșit</b><span>rezervă 80%, clienții vor 20% · 4 lei/zi</span></div><span class="btn">Anunță clienții</span></div>
    <div class="pr"><span class="k" style="background:#8A93A6"></span><div><b>PT 2875 · fără date</b><span>Popești-Leordeni, de 2 zile</span></div><span class="btn">Verifică acordul</span></div>
  </section>

  <section class="w">
    <div class="wh"><span class="ic" style="background:#2c2660;color:#B9AFFF">⚡</span>PT 2041 · casele pe linie<span class="more">12:40 ▾</span></div>
    <div style="color:#A3ABBD;font-size:12px;line-height:1.5;margin-bottom:6px">Casele de la capătul liniei au trecut de 253 V și s-au oprit în același minut. Cele de lângă post au rămas sub 248 V: <b style="color:#E8EBF2">e rețeaua, nu echipamentul.</b></div>
    {strip_svg}
    <div style="display:flex;flex-wrap:wrap;gap:6px 14px;font-size:11px;color:#A3ABBD;margin-top:4px"><span><i class="dot" style="background:#2FBF71"></i>sub 248 V</span><span><i class="dot" style="background:#F5B83D"></i>248–253 V</span><span><i class="dot" style="background:none;border:2px solid #8B7CFF;width:6px;height:6px"></i>oprită</span><span><i class="dot" style="background:#8A93A6"></i>lipsă date</span></div>
  </section>

  <section class="w">
    <div class="wh"><span class="ic" style="background:#13304f;color:#7db0ff">✉</span>Distribuitorul zonei</div>
    <div class="ib"><span class="p" style="background:#2c2660;color:#B9AFFF">RE</span><div><b>Rețele Electrice Muntenia Sud</b><span>2 sesizări trimise luna asta · 1 rezolvată</span></div><small>raport ›</small></div>
    <div class="ib"><span class="p" style="background:#123b2a;color:#5BE39A">✓</span><div><b>Deplasări inutile evitate</b><span>4 în zonă, luna asta</span></div><small></small></div>
  </section></div>

  <div class="back"><span>‹ Toată țara</span><span>Clic pe alt județ sau caută un oraș</span></div>
  <div class="demo">Schiță · cifre ilustrative · date simulate</div>
</main>
</body></html>"""
html = shell.replace(g["css"], css2) + main
open(f"{S}/mock/judet.html", "w").write(html)
print("ok", len(html))
