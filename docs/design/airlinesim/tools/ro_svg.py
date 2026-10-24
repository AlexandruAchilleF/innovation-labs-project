"""Romania counties (Natural Earth admin-1, public domain) -> simplified SVG paths + JSON for inlining."""
import json, math, sys
src, out_json, out_svg = sys.argv[1], sys.argv[2], sys.argv[3]
W = 1000.0
TOL = float(sys.argv[4]) if len(sys.argv) > 4 else 0.7
d = json.load(open(src))
LAT0 = 45.9
k = math.cos(math.radians(LAT0))
pts_all = [c for f in d["features"] for ring in f["geometry"]["coordinates"] for c in ring]
xs = [lon * k for lon, lat in pts_all]; ys = [-lat for lon, lat in pts_all]
minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
s = W / (maxx - minx); H = (maxy - miny) * s
proj = lambda lon, lat: ((lon * k - minx) * s, (-lat - miny) * s)

def dp(pts, tol):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0]-a[0], b[1]-a[1]; L = math.hypot(dx, dy) or 1e-9
    imax, dmax = 0, -1
    for i in range(1, len(pts)-1):
        p = pts[i]
        dd = abs(dy*p[0] - dx*p[1] + b[0]*a[1] - b[1]*a[0]) / L
        if dd > dmax: imax, dmax = i, dd
    if dmax > tol:
        return dp(pts[:imax+1], tol)[:-1] + dp(pts[imax:], tol)
    return [a, b]

counties, total = [], 0
for f in d["features"]:
    p = f["properties"]; code = p["iso_3166_2"].split("-")[1]
    paths = []
    for ring in f["geometry"]["coordinates"]:
        pr = [proj(*c) for c in ring]
        far = max(range(len(pr)), key=lambda i: (pr[i][0]-pr[0][0])**2 + (pr[i][1]-pr[0][1])**2)
        sp = dp(pr[:far+1], TOL)[:-1] + dp(pr[far:], TOL)
        total += len(sp)
        paths.append("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in sp) + "Z")
    xs_ = [proj(*c)[0] for c in f["geometry"]["coordinates"][0]]; ys_ = [proj(*c)[1] for c in f["geometry"]["coordinates"][0]]
    # label anchor = vertex-average centroid (good enough for convex-ish counties)
    cx, cy = sum(xs_)/len(xs_), sum(ys_)/len(ys_)
    counties.append({"code": code, "name": p["name"], "d": "".join(paths), "c": [round(cx, 1), round(cy, 1)]})
json.dump({"w": W, "h": round(H, 1), "lat0": LAT0, "k": k, "minx": minx, "miny": miny, "s": s, "counties": counties}, open(out_json, "w"), ensure_ascii=False)
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} {H:.0f}">']
for c in counties:
    svg.append(f'<path id="{c["code"]}" d="{c["d"]}" fill="#1b2433" stroke="#3a4558" stroke-width="1"/>')
svg.append("</svg>")
open(out_svg, "w").write("\n".join(svg))
print("points", total, "H", round(H, 1))
