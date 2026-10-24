import type { Feature, Polygon } from "geojson";
import boundary from "./romania-boundary.json";

// Natural Earth 1:10m, public domain; provenance is bundled in the feature properties.
export const ROMANIA_BOUNDARY: Feature<Polygon> = {
  type: "Feature",
  properties: boundary.properties,
  geometry: { type: "Polygon", coordinates: boundary.geometry.coordinates },
};
export const COUNTRY_MASK_LAYER_ID = "outside-romania-mask";

// The clockwise Romanian ring is a hole in the counterclockwise world polygon.
export const OUTSIDE_ROMANIA: Feature<Polygon> = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-180, -85.051129],
        [180, -85.051129],
        [180, 85.051129],
        [-180, 85.051129],
        [-180, -85.051129],
      ],
      ...ROMANIA_BOUNDARY.geometry.coordinates,
    ],
  },
};
