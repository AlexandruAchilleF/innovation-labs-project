import json, sys
src, out = sys.argv[1], sys.argv[2]
d = json.load(open(src))
feats = [f for f in d["features"] if f["properties"].get("adm0_a3") == "ROU"]
keep = []
for f in feats:
    p = f["properties"]
    keep.append({"type": "Feature", "properties": {k: p.get(k) for k in ["name", "name_en", "iso_3166_2", "postal", "region", "type_en"]}, "geometry": f["geometry"]})
json.dump({"type": "FeatureCollection", "features": keep}, open(out, "w"))
print(len(keep))
for f in keep:
    print(f["properties"]["iso_3166_2"], f["properties"]["name"], f["geometry"]["type"])
