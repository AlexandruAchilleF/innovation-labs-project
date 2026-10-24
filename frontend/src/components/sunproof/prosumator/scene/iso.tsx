import type { ReactNode } from "react";

/**
 * Isometric projection for the prosumer energy scene. World units are ~metres on a ground plane:
 * +x runs right-down, +y runs left-down, +z is up. Surfaces reuse the Altitude surface steps
 * (top lightest, sides darker) and hairline strokes, never shadows.
 */
export const S = 22;
export const ORIGIN = { x: 330, y: 70 };
const C = Math.cos(Math.PI / 6);

export type P3 = [number, number, number];

export function iso([x, y, z]: P3): [number, number] {
  return [ORIGIN.x + (x - y) * C * S, ORIGIN.y + (x + y) * 0.5 * S - z * S];
}

export const pts = (ps: P3[]) => ps.map((p) => iso(p).join(",")).join(" ");

export const SURF = {
  top: "var(--iron)",
  left: "var(--slate)",
  right: "var(--graphite)",
  line: "var(--pewter)",
};

export interface BoxProps {
  at: P3;
  size: P3;
  top?: string;
  left?: string;
  right?: string;
  /** Drawn on the left (+y) face, in face-local coords: u along x (0..w), v up (0..h). */
  face?: (f: Face) => ReactNode;
}

/** A face-local mapper for the +y face of a box so details (screens, gauges) sit on it. */
export interface Face {
  w: number;
  h: number;
  quad: (u0: number, v0: number, u1: number, v1: number) => string;
  at: (u: number, v: number) => [number, number];
}

export function Box({ at: [x, y, z], size: [w, d, h], top, left, right, face }: BoxProps) {
  const f: Face = {
    w,
    h,
    quad: (u0, v0, u1, v1) =>
      pts([
        [x + u0, y + d, z + v0],
        [x + u1, y + d, z + v0],
        [x + u1, y + d, z + v1],
        [x + u0, y + d, z + v1],
      ]),
    at: (u, v) => iso([x + u, y + d, z + v]),
  };
  return (
    <g stroke={SURF.line} strokeWidth={0.75} strokeLinejoin="round">
      <polygon
        points={pts([
          [x, y + d, z],
          [x + w, y + d, z],
          [x + w, y + d, z + h],
          [x, y + d, z + h],
        ])}
        fill={left ?? SURF.left}
      />
      <polygon
        points={pts([
          [x + w, y, z],
          [x + w, y + d, z],
          [x + w, y + d, z + h],
          [x + w, y, z + h],
        ])}
        fill={right ?? SURF.right}
      />
      <polygon
        points={pts([
          [x, y, z + h],
          [x + w, y, z + h],
          [x + w, y + d, z + h],
          [x, y + d, z + h],
        ])}
        fill={top ?? SURF.top}
      />
      {face?.(f)}
    </g>
  );
}

/** Polyline through world points, for cables (z ~ 0) and lattice towers. */
export function path(ps: P3[]) {
  return ps.map((p, i) => `${i ? "L" : "M"}${iso(p).join(" ")}`).join(" ");
}
