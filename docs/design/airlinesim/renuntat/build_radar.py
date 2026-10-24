import math
W,H=1240,720
CX,CY,RMAX=330,350,280   # radar centre, radius for 450 m
M=450.0
def r(m): return m/M*RMAX
def col(v,state):
    if state=='off': return '#8B7CFF'
    if state=='nodata': return '#8A93A6'
    return '#2FBF71' if v<248 else ('#F5B83D' if v<253 else '#F0564A')
# (id, distance m, angle deg, voltage, state)
houses=[('A1',70,200,239.8,'on'),('A2',110,140,241.0,'on'),('A3',150,250,243.2,'on'),('A4',185,95,244.9,'on'),
('A5',220,215,246.7,'on'),('A6',255,160,248.6,'on'),('A7',280,-110,0,'nodata'),('A8',300,55,250.9,'on'),
('A9',330,-45,252.4,'on'),('A10',375,18,254.1,'off'),('A11',400,-8,254.1,'off'),('A12',420,34,254.0,'off')]
g=[]
# sweep
sw=-10
for i in range(26):
    a0=math.radians(sw-i*2.2); a1=math.radians(sw-(i+1)*2.2)
    op=0.30*(1-i/26)
    g.append(f'<path d="M{CX},{CY} L{CX+RMAX*math.cos(a0):.1f},{CY+RMAX*math.sin(a0):.1f} A{RMAX},{RMAX} 0 0 0 {CX+RMAX*math.cos(a1):.1f},{CY+RMAX*math.sin(a1):.1f} Z" fill="#3FA9F5" opacity="{op:.3f}"/>')
a=math.radians(sw)
g.append(f'<line x1="{CX}" y1="{CY}" x2="{CX+RMAX*math.cos(a):.1f}" y2="{CY+RMAX*math.sin(a):.1f}" stroke="#7cc4ff" stroke-width="2"/>')
rings=''
for m in (100,200,300,400):
    rings+=f'<circle cx="{CX}" cy="{CY}" r="{r(m):.1f}" fill="none" stroke="#263046" stroke-width="1.2"/>'
    rings+=f'<text x="{CX+4}" y="{CY-r(m)-6:.1f}" class="rl">{m} m</text>'
for d in range(0,360,30):
    t=math.radians(d)
    rings+=f'<line x1="{CX}" y1="{CY}" x2="{CX+RMAX*math.cos(t):.1f}" y2="{CY+RMAX*math.sin(t):.1f}" stroke="#1b2232" stroke-width="1"/>'
# 253 V line at ~355 m
r253=r(355)
thr=f'<circle cx="{CX}" cy="{CY}" r="{r253:.1f}" fill="none" stroke="#F0564A" stroke-width="2" stroke-dasharray="7 6" opacity=".9"/>'
thr+=f'<text x="{CX-r253*0.71-8:.1f}" y="{CY+r253*0.71+22:.1f}" class="thr">253 V azi la 12:40</text>'
dots=''
for hid,dm,ang,v,st in houses:
    t=math.radians(ang-90+90)  # angle measured from east
    t=math.radians(ang)
    x=CX+r(dm)*math.cos(t); y=CY+r(dm)*math.sin(t)
    c=col(v,st)
    if st=='off':
        dots+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="16" fill="none" stroke="{c}" stroke-width="2" opacity=".45"/>'
        dots+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="9" fill="#0B0D12" stroke="{c}" stroke-width="3"/>'
    else:
        dots+=f'<circle cx="{x:.1f}" cy="{y:.1f}" r="8" fill="{c}" stroke="#0B0D12" stroke-width="2"/>'
    dots+=f'<text x="{x+13:.1f}" y="{y+4:.1f}" class="hl">{hid}</text>'
pt=f'<rect x="{CX-15}" y="{CY-15}" width="30" height="30" rx="7" fill="#1C4570" stroke="#5b8fd0" stroke-width="2"/><text x="{CX}" y="{CY+5}" class="pt">PT</text>'
svg=f'<svg width="660" height="700" viewBox="0 0 660 700">{rings}{"".join(g)}{thr}{dots}{pt}</svg>'
# time scrub
ticks=''.join(f'<span style="left:{(h-6)/14*100:.2f}%">{h:02d}</span>' for h in range(6,21,2))
html=f'''<!doctype html><html><head><meta charset="utf-8"><style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{width:{W}px;height:{H}px;background:#0B0D12;color:#E8EBF2;font-family:Inter,sans-serif;font-size:13px;overflow:hidden;font-feature-settings:"tnum" 1}}
.hd{{position:absolute;left:28px;top:22px;right:28px;display:flex;align-items:center;gap:12px}}
.hd h1{{font-size:20px;font-weight:600}}.hd .sub{{color:#8F98AB;font-size:13px}}
.tg{{margin-left:auto;display:flex;align-items:center;gap:8px;background:#121722;border:1px solid #252B38;border-radius:999px;padding:6px 14px 6px 8px;color:#C9D0DE}}
.sw{{width:30px;height:18px;border-radius:9px;background:#3FA9F5;position:relative}}.sw:after{{content:"";position:absolute;right:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#fff}}
.rad{{position:absolute;left:0;top:40px}}
.rl{{fill:#5d6780;font-size:12px}}.hl{{fill:#C9D0DE;font-size:13px;font-weight:600;paint-order:stroke;stroke:#0B0D12;stroke-width:4px}}
.thr{{fill:#FF8A80;font-size:13px;font-weight:600}}.pt{{fill:#fff;font-size:11px;font-weight:700;text-anchor:middle}}
.pn{{position:absolute;left:690px;top:76px;width:520px;display:flex;flex-direction:column;gap:14px}}
.card{{background:#121722;border:1px solid #232a3a;border-radius:14px;padding:16px 18px}}
.v{{font-size:22px;font-weight:600;line-height:1.3}}.v em{{font-style:normal;color:#B9AFFF}}
.why{{color:#A3ABBD;margin-top:8px;line-height:1.55;font-size:13.5px}}
.kp{{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}}
.kp div{{border-left:3px solid #2a3142;padding-left:9px}}.kp small{{color:#8F98AB;font-size:11.5px;display:block}}.kp b{{font-size:19px;font-weight:600}}
.btns{{display:flex;gap:10px;margin-top:16px}}
.b1{{background:#6d62ff;color:#fff;border-radius:9px;padding:9px 14px;font-weight:600}}.b2{{border:1px solid #2E3850;color:#C9D0DE;border-radius:9px;padding:9px 14px}}
.lg{{display:flex;flex-wrap:wrap;gap:8px 18px;color:#A3ABBD;font-size:12.5px}}.lg i{{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;vertical-align:-1px}}
.ch{{font-weight:600;margin-bottom:8px}}
.chart{{height:120px;position:relative}}
.scr{{position:absolute;left:40px;right:560px;bottom:26px}}
.bar{{height:6px;border-radius:3px;background:linear-gradient(90deg,#1f2a3c 0%,#1f2a3c 40%,#5a4512 42%,#8a2c25 50%,#8a2c25 64%,#5a4512 68%,#1f2a3c 75%)}}
.knob{{position:absolute;left:{(12+40/60-6)/14*100:.2f}%;top:-7px;width:20px;height:20px;border-radius:50%;background:#fff;border:4px solid #3FA9F5;transform:translateX(-50%)}}
.ts{{position:relative;height:18px;margin-top:8px;color:#5d6780;font-size:11.5px}}.ts span{{position:absolute;transform:translateX(-50%)}}
.cap{{position:absolute;left:40px;bottom:72px;color:#8F98AB;font-size:12.5px}}.cap b{{color:#E8EBF2}}
.ft{{position:absolute;right:28px;bottom:14px;color:#5d6780;font-size:11.5px}}
</style></head><body>
<div class="hd"><h1>PT 2041 · stradă simulată, București</h1><span class="sub">12 case cu acord · Rețele Electrice Muntenia Sud</span><div class="tg"><span class="sw"></span>Vedere radar</div></div>
<div class="rad">{svg}</div>
<div class="cap">Ora pe care o vezi: <b>12:40</b> · trage ca să vezi ziua</div>
<div class="scr"><div class="bar"></div><div class="knob"></div><div class="ts">{ticks}</div></div>
<div class="pn">
 <div class="card"><div class="v">Rețea, nu echipament: <em>3 case la capătul liniei</em> s-au oprit în același minut.</div>
 <div class="why">A10, A11 și A12 au văzut 254,1 V în medie pe 10 minute, peste pragul de 253 V, și s-au reconectat după 15 minute. Casele aproape de post au rămas sub 248 V. Așa arată supratensiunea pe o linie lungă, nu un invertor defect.</div>
 <div class="kp"><div style="border-color:#8B7CFF"><small>Case oprite</small><b>3</b></div><div style="border-color:#F0564A"><small>Tensiune max.</small><b>254,1 V</b></div><div style="border-color:#F5B83D"><small>Pierdut azi</small><b>4,8 kWh</b></div><div><small>Fără date</small><b>1</b></div></div>
 <div class="btns"><span class="b1">Trimite la distribuitor ›</span><span class="b2">Vezi dosarul PDF</span><span class="b2">Anunță clienții</span></div></div>
 <div class="card"><div class="ch">Cum se citește</div><div class="lg"><span><i style="background:#2FBF71"></i>sub 248 V</span><span><i style="background:#F5B83D"></i>248–253 V</span><span><i style="background:#F0564A"></i>peste 253 V</span><span><i style="background:none;border:2px solid #8B7CFF"></i>oprită</span><span><i style="background:#8A93A6"></i>lipsă date</span></div>
 <div class="why" style="margin-top:10px">Postul e în centru. Cercurile arată distanța pe linie până la fiecare casă. Linia roșie punctată arată unde tensiunea trece de 253 V la ora aleasă: tot ce e dincolo de ea riscă să se oprească.</div></div>
</div>
<div class="ft">Schiță · date simulate (sunproof/feeder.py) · cifrele din test: 4,8 kWh pierduți</div>
</body></html>'''
open('mock/radar.html','w').write(html)
print('ok',len(html))
