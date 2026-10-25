"""Genereaza 4 grafice SVG (1200x675) + index.html pentru pitch. Fara dependente externe."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from xml.sax.saxutils import escape
from sunproof.api_support import portfolio_metrics, raw_analysis
from sunproof.scenarios import get_scenario_by_id, get_all_neighborhood_analyses

OUT = Path(__file__).resolve().parent.parent / "docs" / "pitch" / "charts"
NAVY, AMBER, RED, GREEN, BLUE, GREY = "#0f172a", "#f59e0b", "#ef4444", "#10b981", "#3b82f6", "#64748b"
SANS = "Inter, Arial, sans-serif"
MONO = "'JetBrains Mono', Menlo, monospace"
W, H = 1200, 675


def t(x, y, s, size=16, fill=NAVY, anchor="start", weight=400, mono=False):
    fam = MONO if mono else SANS
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-family="{fam}" font-size="{size}" fill="{fill}" '
            f'text-anchor="{anchor}" font-weight="{weight}">{escape(str(s))}</text>')


def frame(title, sub, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
            f'<rect width="{W}" height="{H}" fill="#ffffff"/>'
            + t(50, 62, title, 30, weight=700) + t(50, 96, sub, 16, GREY) + body + "</svg>")


def ro(n, d=0):
    return f"{n:,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def rect(x, y, w, h, fill, rx=6):
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}"/>'


def line(x1, y1, x2, y2, c, w=1, dash=""):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{c}" stroke-width="{w}"{d}/>'


def poly(pts, c, w=3):
    p = " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)
    return f'<polyline points="{p}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linejoin="round"/>'


def chart1():
    base, x0, bw = 590, 120, 150
    sc = 400 / 160000
    b = line(80, base, 700, base, GREY)
    for i, (lab, v, c) in enumerate([("iunie 2026", 127084, BLUE), ("august 2026", 151040, GREEN)]):
        x = x0 + i * 270
        h = v * sc
        b += rect(x, base - h, bw, h, c) + t(x + bw / 2, base - h - 12, ro(v), 24, anchor="middle", weight=700, mono=True)
        b += t(x + bw / 2, base + 28, lab, 16, anchor="middle") + t(x + bw / 2, base - h / 2, "baterii", 16, "#fff", "middle")
    b += t(x0 + 135 + 135, 300, "+23.956", 26, AMBER, "middle", 700, True)
    # proportia setata neoptim (esantion DEO)
    px, pw = 780, 340
    b += t(px, 200, "Esantion DEO: 460 invertoare setate gresit", 17, weight=700)
    b += rect(px, 225, pw, 46, "#e2e8f0") + rect(px, 225, pw * 0.6, 46, RED)
    b += t(px + pw * 0.3, 255, "60% neoptim", 17, "#fff", "middle", 700) + t(px + pw * 0.8, 255, "40% ok", 17, NAVY, "middle")
    b += t(px, 300, "= ~276 din 460 (cifra DEO, ilustrativa)", 14, GREY, mono=True)
    b += t(px, 360, "Cine verifica setarile bateriei", 17, weight=700) + t(px, 388, "inainte de varful de seara? Nimeni.", 17, RED, weight=700)
    b += t(50, 640, "Surse: ANRE 2026 (385.791 prosumatori); eșantion DEO — ilustrativ, nu proiecție la nivel național.", 13, GREY)
    return frame("1. Bateriile cresc mai repede decât oricine le verifică.",
                 "Real · Date ANRE 2026: +23.956 baterii noi în doar 2 luni (39% din 385.791 prosumatori)", b)


def chart2():
    tel = get_scenario_by_id("RO-TM-001").inverter_telemetry
    bins = [tel[i:i + 5] for i in range(0, 1440, 5)]
    m = lambda f: [sum(f(s) for s in g) / len(g) for g in bins]
    pvg, pv, v = m(lambda s: s.pvgis_expected_kw), m(lambda s: s.pv_power_kw), [max(s.ac_voltage_v for s in g) for g in bins]
    L, R, T, B = 90, 1110, 140, 560
    X = lambda i: L + (R - L) * i / (len(bins) - 1)
    ymax = 7.5
    Yp = lambda k: B - (B - T) * k / ymax
    vmin, vmax = 228, 260
    Yv = lambda x: B - (B - T) * (x - vmin) / (vmax - vmin)
    b = line(L, B, R, B, GREY) + line(L, T, L, B, GREY)
    for hh in range(0, 25, 3):
        x = L + (R - L) * hh / 24
        b += line(x, B, x, B + 5, GREY) + t(x, B + 24, f"{hh:02d}:00", 13, GREY, "middle", mono=True)
    for k in (0, 2, 4, 6):
        b += t(L - 10, Yp(k) + 5, f"{k}", 13, AMBER, "end", mono=True)
    for x in (230, 240, 250, 260):
        b += t(R + 10, Yv(x) + 5, f"{x}", 13, BLUE, mono=True)
    b += t(L - 10, T - 12, "kW", 13, AMBER, "end") + t(R + 10, T - 12, "V", 13, BLUE)
    b += poly([(X(i), Yp(k)) for i, k in enumerate(pvg)], AMBER, 3)
    b += poly([(X(i), Yp(k)) for i, k in enumerate(pv)], NAVY, 2)
    b += poly([(X(i), Yv(x)) for i, x in enumerate(v)], BLUE, 2.5)
    b += line(L, Yv(253), R, Yv(253), RED, 2, "8 6") + t(L + 8, Yv(253) - 8, "253 V · prag EN 50549-1", 14, RED, weight=700, mono=True)
    over = [i for i, x in enumerate(v) if x > 253]
    if over:
        b += rect(X(over[0]), T, X(over[-1]) - X(over[0]), B - T, RED, 0).replace('fill="#ef4444"', 'fill="#ef4444" fill-opacity="0.08"')
    lx = 130
    for lab, c in [("PVGIS (așteptat)", AMBER), ("Producție reală (limitată la amiază)", NAVY), ("Tensiune AC invertor", BLUE)]:
        b += line(lx, 612, lx + 30, 612, c, 4) + t(lx + 38, 617, lab, 14)
        lx += 340
    return frame("2. Amiaza: producție maximă și risc de supratensiune.",
                 "Producție solară reală (PVGIS) vs. Tensiune AC la invertor și pragul legal EN 50549-1 (253 V) — RO-TM-001", b)


def chart3():
    hs = sorted(get_all_neighborhood_analyses()[0].houses, key=lambda h: h.distance_m)
    L, R, T, B = 90, 1110, 150, 560
    vmin, vmax = 230, 262
    Y = lambda v: B - (B - T) * (v - vmin) / (vmax - vmin)
    bw = (R - L) / len(hs)
    b = line(L, B, R, B, GREY)
    for v in (230, 240, 250, 260):
        b += t(L - 10, Y(v) + 5, v, 13, GREY, "end", mono=True) + line(L, Y(v), R, Y(v), "#e2e8f0")
    for i, h in enumerate(hs):
        c = RED if h.max_pcc_voltage_v > 253 else GREEN
        b += rect(L + i * bw + 1, Y(h.max_pcc_voltage_v), bw - 2, B - Y(h.max_pcc_voltage_v), c, 2)
    b += line(L, Y(253), R, Y(253), NAVY, 2, "8 6") + t(L + 8, Y(253) - 8, "253 V · EN 50549-1", 14, NAVY, weight=700, mono=True)
    b += t(L, B + 26, f"PT · {hs[0].distance_m} m", 14, GREEN, weight=700, mono=True)
    b += t(R, B + 26, f"capăt · {hs[-1].distance_m} m", 14, RED, "end", 700, True)
    b += t((L + R) / 2, B + 26, "distanță față de postul de transformare →", 14, GREY, "middle")
    b += t(L - 10, T - 14, "V max", 13, GREY, "end")
    n_ok, n_bad = sum(h.max_pcc_voltage_v <= 253 for h in hs), sum(h.max_pcc_voltage_v > 253 for h in hs)
    b += rect(L, 600, 14, 14, GREEN, 2) + t(L + 22, 612, f"{n_ok} case ≤ 253 V", 14) + rect(L + 190, 600, 14, 14, RED, 2) + t(L + 212, 612, f"{n_bad} case > 253 V (se opresc)", 14)
    return frame("3. Capătul străzii se oprește primul, deși panourile sunt bune.",
                 "Simulare fizică JT pe stradă: tensiunea maximă crește cu distanța față de postul de transformare", b)


def chart4():
    base, bw = 560, 130
    sc = 330 / 100
    bv, pm = raw_analysis("RO-CJ-003").battery_verdict, portfolio_metrics()
    got, want = round(bv.configured_min_soc_pct), round(bv.desired_min_soc_pct)
    b = line(70, base, 520, base, GREY) + t(70, 140, "RO-CJ-003 · SoC minim al bateriei", 17, weight=700)
    for x, lab, v, c in [(110, "Setat acum", got, RED), (300, "Dorit de client", want, GREEN)]:
        b += rect(x, base - v * sc, bw, v * sc, c) + t(x + bw / 2, base - v * sc - 12, f"{v}%", 26, anchor="middle", weight=700, mono=True)
        b += t(x + bw / 2, base + 28, lab, 15, anchor="middle")
    b += t(290, 215, "→", 30, GREY, "middle") + t(70, 612, f"Baterie blocată la {got}% în loc de {want}% dorit; PZU seară ≈ 8× amiază.", 14, GREY)
    cards = [("81/81 · 80/81", "rețea vs. echipament · 1 min / 5 min", GREEN), ("0/60", "alarme false", GREEN),
             (f"{ro(pm.fleet_avoided_truck_rolls_ron)} RON/lună", "deplasări evitate", BLUE),
             (f"{ro(pm.fleet_monthly_pzu_savings_ron, 2)} RON/lună", f"pierdere PZU pe {pm.misconfigured_batteries_count} baterii", AMBER),
             (f"≈{ro(round(pm.extrapolated_annual_supplier_savings_eur, -3))} EUR/an", f"la {ro(pm.extrapolated_prosumers_count)} prosumatori", RED)]
    for i, (big, small, c) in enumerate(cards):
        y = 130 + i * 90
        b += rect(600, y, 550, 76, "#f8fafc") + rect(600, y, 8, 76, c, 2)
        b += t(630, y + 36, big, 26, c if c != AMBER else "#b45309", weight=700, mono=True) + t(630, y + 61, small, 15, GREY)
    return frame("4. Ce pierd prosumatorul și furnizorul, și dovada că detecția merge.",
                 f"RO-CJ-003 (baterie blocată la {got}% vs. {want}% dorit, PZU seară 8× amiază) + evaluare pe 81 de case (0 alarme false)", b)


FACTS = ["+23.956 baterii în 2 luni", "60% din 460 invertoare DEO setate greșit", "253 V prag EN 50549-1", "81/81 scenarii · 0 alarme false", "≈713.000 EUR/an la 25.000 prosumatori"]
HTML = """<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>SunProof — pitch</title>
<meta name="viewport" content="width=device-width,initial-scale=1"><style>
html{scroll-snap-type:y mandatory;scroll-behavior:smooth}body{margin:0;background:#0f172a;font-family:Inter,Arial,sans-serif;color:#fff}
section{height:100vh;scroll-snap-align:start;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}
img{max-width:94vw;max-height:80vh;background:#fff;border-radius:10px}.k{font:14px 'JetBrains Mono',monospace;color:#f59e0b}
.hint{position:fixed;right:16px;bottom:12px;font:12px 'JetBrains Mono',monospace;color:#94a3b8}</style></head><body>
%s<div class="hint">↑ ↓ / ← → navigare</div><script>
const s=[...document.querySelectorAll('section')];const cur=()=>Math.round(scrollY/innerHeight);
addEventListener('keydown',e=>{const d={ArrowRight:1,ArrowDown:1,PageDown:1,' ':1,ArrowLeft:-1,ArrowUp:-1,PageUp:-1}[e.key];
if(d){e.preventDefault();s[Math.max(0,Math.min(s.length-1,cur()+d))].scrollIntoView({behavior:'smooth'})}});</script></body></html>"""


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    names = {"chart1_baterii_anre": chart1, "chart2_pranz_pvgis_tensiune": chart2,
             "chart3_capatul_strazii": chart3, "chart4_pierderi_si_dovada": chart4}
    secs = []
    for i, (n, f) in enumerate(names.items()):
        (OUT / f"{n}.svg").write_text(f(), encoding="utf-8")
        secs.append(f'<section id="s{i+1}"><img src="{n}.svg" alt="{n}"><div class="k">{escape(FACTS[i])}</div></section>')
    secs.append(f'<section id="s5"><h1>SunProof</h1><div class="k">{escape(" · ".join(FACTS))}</div></section>')
    (OUT / "index.html").write_text(HTML % "".join(secs), encoding="utf-8")


if __name__ == "__main__":
    main()
