#!/usr/bin/env python3
"""Import bounded OSM geography for synthetic demo scenarios (never utility topology).

Run: .venv/bin/python scripts/import_map_geometry.py
Uses cached official OSM XML under ignored data/raw/map-geometry; --refresh downloads again.
Requires frontend npm dependencies and the project's Python environment.
"""
from __future__ import annotations

import argparse
import datetime as dt
import heapq
import json
import math
import subprocess
import sys
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
ROAD_TYPES = {"residential", "living_street", "unclassified", "service", "tertiary", "secondary", "primary"}
BUILDING_TYPES = {"yes", "house", "detached", "semidetached_house", "terrace", "residential", "apartments"}


def contains(p, polygon):
    x, y = p
    inside = False
    for a, b in zip(polygon, polygon[1:] + polygon[:1]):
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            inside = not inside
    return inside


def interior_point(poly):
    # Scanlines work for concave footprints too; select the widest interior span.
    ys = sorted(set(p[1] for p in poly))
    best = None
    for lo, hi in zip(ys, ys[1:]):
        y = (lo + hi) / 2
        xs = sorted(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])
                    for a, b in zip(poly, poly[1:] + poly[:1]) if (a[1] > y) != (b[1] > y))
        for a, b in zip(xs[::2], xs[1::2]):
            candidate = (b - a, ((a + b) / 2, y))
            if best is None or candidate[0] > best[0]:
                best = candidate
    if best is None:
        raise ValueError("Degenerate building footprint")
    return best[1]


def distance(a, b):
    lat = math.radians((a[1] + b[1]) / 2)
    return math.hypot((a[0] - b[0]) * 111320 * math.cos(lat), (a[1] - b[1]) * 110540)


def road_graph(nodes, ways):
    graph, edges = {}, {}
    for w in ways:
        if w["tags"].get("highway") not in ROAD_TYPES or w["tags"].get("area") == "yes":
            continue
        for a, b in zip(w["nodes"], w["nodes"][1:]):
            if a == b or a not in nodes or b not in nodes:
                continue
            weight = distance(nodes[a], nodes[b])
            graph.setdefault(a, {})[b] = weight
            graph.setdefault(b, {})[a] = weight
            edges[tuple(sorted((a, b)))] = w
    return graph, edges


def shortest_path(graph, start, goal):
    queue, costs, parents = [(0, start)], {start: 0}, {}
    while queue:
        cost, node = heapq.heappop(queue)
        if cost != costs[node]:
            continue
        if node == goal:
            path = [node]
            while node != start:
                node = parents[node]
                path.append(node)
            return path[::-1]
        for nxt, weight in graph.get(node, {}).items():
            candidate = cost + weight
            if candidate < costs.get(nxt, math.inf):
                costs[nxt], parents[nxt] = candidate, node
                heapq.heappush(queue, (candidate, nxt))
    return None


def read_osm(path):
    root = ET.parse(path).getroot()
    nodes = {int(n.attrib["id"]): (float(n.attrib["lon"]), float(n.attrib["lat"])) for n in root.findall("node")}
    ways = [{"id": int(w.attrib["id"]), "nodes": [int(n.attrib["ref"]) for n in w.findall("nd")],
             "tags": {t.attrib["k"]: t.attrib["v"] for t in w.findall("tag")}} for w in root.findall("way")]
    return nodes, ways


def scenarios():
    from sunproof.neighborhoods import get_neighborhood_specs
    result = []
    for nb in get_neighborhood_specs().values():
        streets = {f.feeder_id: f.street_name for f in nb.feeders}
        result.append({"id": nb.neighborhood_id, "center": [nb.longitude, nb.latitude], "houses": [
            {"id": h.client.household_id if h.client else h.house_id, "feeder": h.feeder_id,
             "distance": h.distance_from_transformer_m, "street": streets[h.feeder_id],
             "target": [h.x_m, h.y_m]} for h in nb.houses]})
    # Bundle the actual offline generator, rather than duplicating its PRNG or ID allocation.
    js = '''import {rolldown} from "rolldown";
const bundle=await rolldown({input:"scripts/map-scenarios.ts"});
const {output}=await bundle.generate({format:"esm"});
const m=await import("data:text/javascript;base64,"+Buffer.from(output[0].code).toString("base64"));
process.stdout.write(JSON.stringify(m.default));'''
    result.extend(json.loads(subprocess.check_output(["node", "--input-type=module", "-e", js], cwd=ROOT / "frontend")))
    return result


def normalized_street(name):
    import unicodedata
    s = "".join(c for c in unicodedata.normalize("NFD", name.lower()) if not unicodedata.combining(c))
    return s.replace("strada ", "").replace("str. ", "").strip()


def build_snapshot(scenario, nodes, ways):
    original = scenario["center"]
    graph, edges = road_graph(nodes, ways)
    if not graph:
        raise ValueError(f'{scenario["id"]}: no mapped roads')
    # A tiny private driveway must not win over the connected neighborhood streets.
    components, remaining = [], set(graph)
    while remaining:
        stack, component = [min(remaining)], set()
        while stack:
            n = stack.pop()
            if n in component:
                continue
            component.add(n)
            stack.extend(x for x in graph[n] if x not in component)
        remaining.difference_update(component)
        components.append(component)
    eligible = [c for c in components if len(c) >= 20] or components
    component = min(eligible, key=lambda c: min(distance(nodes[n], original) for n in c))
    root = min(component, key=lambda n: distance(nodes[n], original))
    center = nodes[root]
    graph = {n: graph[n] for n in component}
    local_edges = [(a, b, w) for (a, b), w in edges.items() if a in component and b in component]

    def project(point, a, b):
        # Work in local metres; linear interpolation maps back exactly to the OSM segment.
        cos = math.cos(math.radians(original[1]))
        vx, vy = (b[0] - a[0]) * cos, b[1] - a[1]
        wx, wy = (point[0] - a[0]) * cos, point[1] - a[1]
        t = max(0, min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)))
        return (a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])), t

    buildings = []
    for w in ways:
        tags = w["tags"]
        if tags.get("building") not in BUILDING_TYPES or any(k in tags for k in ("shop", "industrial", "office", "amenity")):
            continue
        if len(w["nodes"]) < 4 or w["nodes"][0] != w["nodes"][-1] or any(n not in nodes for n in w["nodes"]):
            continue
        poly = [nodes[n] for n in w["nodes"]]
        try:
            anchor = interior_point(poly)
        except ValueError:
            continue
        if distance(original, anchor) > 1500:
            continue
        choices = []
        for a, b, road in local_edges:
            p, t = project(anchor, nodes[a], nodes[b])
            choices.append((distance(anchor, p), a, b, p, t, road))
        gap, a, b, p, t, road = min(choices, key=lambda x: x[0])
        if gap > 90:  # do not connect deep courtyards across arbitrary blocks
            continue
        width = (max(p[0] for p in poly) - min(p[0] for p in poly)) * 111320 * math.cos(math.radians(anchor[1]))
        height = (max(p[1] for p in poly) - min(p[1] for p in poly)) * 110540
        if min(width, height) < 3 or max(width, height) > 100:
            continue
        buildings.append({"id": w["id"], "anchor": anchor, "footprint": poly, "sizeM": min(width, height),
                          "edge": (a, b), "roadPoint": p, "t": t, "street": road["tags"].get("name", ""), "roadId": road["id"]})
    used, assignments, previous, attachments = set(), {}, {}, {}
    for h in sorted(scenario["houses"], key=lambda h: (h["feeder"], h["distance"], h["id"])):
        target = h.get("target")
        if target is None:
            f = int(h["feeder"])
            angle = math.radians(-15 + (f % 4) * 95)
            target = [math.cos(angle) * h["distance"], math.sin(angle) * h["distance"]]
        ll = (original[0] + target[0] / (111320 * math.cos(math.radians(original[1]))), original[1] + target[1] / 110540)
        desired = normalized_street(h.get("street", ""))
        candidates = [b for b in buildings if b["id"] not in used]
        if not candidates:
            continue
        building = min(candidates, key=lambda b: (0 if desired and normalized_street(b["street"]) == desired else 400,
                                                distance(ll, b["anchor"]), b["id"]))
        used.add(building["id"])
        # Insert a road attachment; multiple houses on one original edge are connected
        # in geometric order below, never directly to a different disconnected street.
        attachment = -(len(assignments) + 1)
        nodes[attachment] = building["roadPoint"]
        attachments[attachment] = building
        assignments[h["id"]] = {"buildingId": building["id"], "at": building["anchor"],
                                 "footprint": building["footprint"], "sizeM": round(building["sizeM"], 2),
                                 "street": building["street"], "roadId": building["roadId"], "attachment": attachment,
                                 "feeder": h["feeder"]}
    split = {}
    for node, b in attachments.items():
        split.setdefault(b["edge"], []).append((b["t"], node))
    for (a, b), inserts in split.items():
        graph[a].pop(b, None)
        graph[b].pop(a, None)
        chain = [a] + [node for _, node in sorted(inserts)] + [b]
        for u, v in zip(chain, chain[1:]):
            weight = distance(nodes[u], nodes[v])
            graph.setdefault(u, {})[v] = weight
            graph.setdefault(v, {})[u] = weight
    for h in sorted(scenario["houses"], key=lambda h: (h["feeder"], h["distance"], h["id"])):
        entry = assignments.get(h["id"])
        if not entry:
            continue
        node = entry.pop("attachment")
        path = shortest_path(graph, previous.get(h["feeder"], root), node)
        if path is None:
            raise ValueError("Disconnected route escaped component filtering")
        coords = [nodes[n] for n in path]
        if len(coords) == 1:
            coords *= 2
        entry["path"] = coords
        previous[h["feeder"]] = node
    return {"center": center, "sourceCenter": original, "houses": assignments,
            "missing": [h["id"] for h in scenario["houses"] if h["id"] not in assignments],
            "roads": [{"id": w["id"], "coordinates": [nodes[n] for n in w["nodes"] if n in nodes]}
                      for w in ways if w["tags"].get("highway") in ROAD_TYPES and any(n in component for n in w["nodes"])]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--only", help="Build one neighborhood while retaining other bundled snapshots")
    args = parser.parse_args()
    cache = ROOT / "data/raw/map-geometry"
    cache.mkdir(parents=True, exist_ok=True)
    dest = ROOT / "frontend/src/lib/map-geometry.json"
    data = json.loads(dest.read_text()) if args.only and dest.exists() else {"neighborhoods": {}}
    for s in scenarios():
        if args.only and s["id"] != args.only:
            continue
        lon, lat = s["center"]
        bbox = [round(lon - .012, 6), round(lat - .009, 6), round(lon + .012, 6), round(lat + .009, 6)]
        url = "https://www.openstreetmap.org/api/0.6/map?bbox=" + ",".join(map(str, bbox))
        raw = cache / f'{s["id"]}.osm'
        if args.refresh or not raw.exists():
            print(f'Downloading {s["id"]}', flush=True)
            request = urllib.request.Request(url, headers={"User-Agent": "SunProof-demo-geography/1.0"})
            try:
                with urllib.request.urlopen(request, timeout=45) as response:
                    content = response.read()
            except urllib.error.HTTPError as error:
                if error.code != 400:
                    raise
                # Dense city centers can exceed the OSM map API node limit.
                bbox = [round(lon - .006, 6), round(lat - .0045, 6), round(lon + .006, 6), round(lat + .0045, 6)]
                url = "https://www.openstreetmap.org/api/0.6/map?bbox=" + ",".join(map(str, bbox))
                request = urllib.request.Request(url, headers={"User-Agent": "SunProof-demo-geography/1.0"})
                with urllib.request.urlopen(request, timeout=45) as response:
                    content = response.read()
            ET.fromstring(content)  # never cache an HTML error document
            raw.write_bytes(content)
            raw.with_suffix(".source.json").write_text(json.dumps({"url": url, "bbox": bbox}))
        source_file = raw.with_suffix(".source.json")
        if source_file.exists():
            source = json.loads(source_file.read_text())
            url, bbox = source["url"], source["bbox"]
        nodes, ways = read_osm(raw)
        snapshot = build_snapshot(s, nodes, ways)
        snapshot["source"] = {"url": url, "bbox": bbox, "retrievedAt": dt.datetime.fromtimestamp(raw.stat().st_mtime, dt.timezone.utc).isoformat()}
        data["neighborhoods"][s["id"]] = snapshot
        print(f'{s["id"]}: {len(snapshot["houses"])}/{len(s["houses"])} buildings; {len(snapshot["roads"])} roads; missing={snapshot["missing"]}', flush=True)
        data.update({"attribution": "© OpenStreetMap contributors", "license": "https://opendatacommons.org/licenses/odbl/1-0/", "copyright": "https://www.openstreetmap.org/copyright"})
        dest.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
