import type { HouseStatus } from "@/lib/geo";

export const MODULE_KWP = 0.45;
const MODULE_ASPECT = 1.6; // portrait 1.1 x 1.75 m module

export const moduleFill: Record<HouseStatus, string> = {
  night: "var(--obsidian)",
  normal: "var(--navy)",
  derating: "var(--warning)",
  trip: "var(--critical)",
};

export const ledFill: Record<HouseStatus, string> = {
  night: "var(--smoke)",
  normal: "var(--success)",
  derating: "var(--warning)",
  trip: "var(--critical)",
};

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Fits `n` portrait modules into `area`, picking the column count that gives the largest module. */
export function layoutArray(n: number, area: Box) {
  let best = { cols: 1, rows: n, mw: 0, mh: 0 };
  for (let cols = 1; cols <= Math.max(1, n); cols++) {
    const rows = Math.ceil(n / cols);
    const mw = Math.min(area.w / cols, area.h / rows / MODULE_ASPECT);
    if (mw > best.mw) best = { cols, rows, mw, mh: mw * MODULE_ASPECT };
  }
  const { cols, rows, mw, mh } = best;
  const x0 = area.x + (area.w - cols * mw) / 2;
  const y0 = area.y + (area.h - rows * mh) / 2;
  return { cols, rows, mw, mh, x0, y0 };
}
