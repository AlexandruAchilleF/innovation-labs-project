from scripts.import_map_geometry import interior_point, contains, shortest_path, road_graph


def test_anchor_is_inside_concave_building():
    footprint = [(0, 0), (6, 0), (6, 1), (1, 1), (1, 6), (0, 6), (0, 0)]
    assert contains(interior_point(footprint), footprint)


def test_road_route_keeps_bends_and_does_not_cross_disconnected_components():
    graph = {1: {2: 1}, 2: {1: 1, 3: 1}, 3: {2: 1}, 4: {5: 1}, 5: {4: 1}}
    assert shortest_path(graph, 1, 3) == [1, 2, 3]
    assert shortest_path(graph, 1, 4) is None


def test_graph_uses_shared_osm_nodes_instead_of_geometric_crossings():
    nodes = {1: (0, 0), 2: (2, 2), 3: (0, 2), 4: (2, 0)}
    ways = [{"id": 10, "nodes": [1, 2], "tags": {"highway": "residential"}},
            {"id": 20, "nodes": [3, 4], "tags": {"highway": "residential"}}]
    graph, _ = road_graph(nodes, ways)
    assert shortest_path(graph, 1, 4) is None


def test_bundled_houses_are_inside_distinct_buildings_and_every_trunk_segment_follows_an_osm_road():
    import json
    import math
    from pathlib import Path
    data = json.loads(Path('frontend/src/lib/map-geometry.json').read_text())
    assert len(data['neighborhoods']) == 16
    for key, nb in data['neighborhoods'].items():
        assert not nb['missing'], key
        assert nb['source']['url'].startswith('https://www.openstreetmap.org/api/0.6/map?bbox=')
        ids = [h['buildingId'] for h in nb['houses'].values()]
        assert len(ids) == len(set(ids)), key
        # Index actual OSM street segments. Do not use generated route geometry as the oracle.
        cells = {}
        scale = 1000
        for road in nb['roads']:
            for a, b in zip(road['coordinates'], road['coordinates'][1:]):
                for x in range(math.floor(min(a[0], b[0]) * scale), math.floor(max(a[0], b[0]) * scale) + 1):
                    for y in range(math.floor(min(a[1], b[1]) * scale), math.floor(max(a[1], b[1]) * scale) + 1):
                        cells.setdefault((x, y), []).append((a, b))

        def on_segment(p, a, b):
            dx, dy = b[0] - a[0], b[1] - a[1]
            length = math.hypot(dx, dy)
            if length == 0:
                return math.dist(p, a) < 1e-9
            cross = abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / length
            dot = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length**2
            return cross < 1e-9 and -1e-7 <= dot <= 1 + 1e-7

        for house in nb['houses'].values():
            assert contains(house['at'], house['footprint']), (key, house['buildingId'])
            assert len(house['path']) >= 2
            for a, b in zip(house['path'], house['path'][1:]):
                midpoint = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
                edges = cells.get((math.floor(midpoint[0] * scale), math.floor(midpoint[1] * scale)), [])
                assert any(on_segment(a, u, v) and on_segment(b, u, v) for u, v in edges), (key, a, b)


def test_snapshots_cover_current_backend_household_ids_and_feeders():
    import json
    from pathlib import Path
    from sunproof.neighborhoods import get_neighborhood_specs
    data = json.loads(Path('frontend/src/lib/map-geometry.json').read_text())['neighborhoods']
    for nb in get_neighborhood_specs().values():
        saved = data[nb.neighborhood_id]
        for house in nb.houses:
            canonical_id = house.client.household_id if house.client else house.house_id
            assert saved['houses'][canonical_id]['feeder'] == house.feeder_id
