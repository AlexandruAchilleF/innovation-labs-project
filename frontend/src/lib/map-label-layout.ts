// Screen-space label placement only; geographic anchors never move.
export const MAP_LABEL_WIDTH = 160;
export const MAP_LABEL_HEIGHT = 44;
interface Anchor {
  id: string;
  x: number;
  y: number;
}
export interface MapLabelPosition extends Anchor {
  compact: boolean;
}

export function layoutMapLabels(
  anchors: Anchor[],
  width: number,
  height: number,
  activeId?: string,
): MapLabelPosition[] {
  const placed: MapLabelPosition[] = [];
  const gap = 6;
  const maxOffset = 64;
  const step = 8;
  const left = 8;
  const right = Math.max(left, width - MAP_LABEL_WIDTH - 8);
  const top = Math.min(80, Math.max(8, height - MAP_LABEL_HEIGHT - 8));
  const bottom = Math.max(top, height - MAP_LABEL_HEIGHT - 180);
  const ordered = [...anchors].sort(
    (a, b) => Number(b.id === activeId) - Number(a.id === activeId),
  );
  for (const anchor of ordered) {
    const candidates: { x: number; y: number; distance: number }[] = [];
    for (let row = -maxOffset / step; row <= maxOffset / step; row++) {
      for (let col = -maxOffset / step; col <= maxOffset / step; col++) {
        const x = Math.max(left, Math.min(right, anchor.x - MAP_LABEL_WIDTH / 2 + col * step));
        const y = Math.max(top, Math.min(bottom, anchor.y - MAP_LABEL_HEIGHT / 2 + row * step));
        const distance =
          (x + MAP_LABEL_WIDTH / 2 - anchor.x) ** 2 + (y + MAP_LABEL_HEIGHT / 2 - anchor.y) ** 2;
        if (distance <= maxOffset ** 2) candidates.push({ x, y, distance });
      }
    }
    candidates.sort((a, b) => a.distance - b.distance);
    const candidate =
      width >= MAP_LABEL_WIDTH + 16
        ? candidates.find((a) =>
            placed.every(
              (b) =>
                b.compact ||
                a.x + MAP_LABEL_WIDTH + gap <= b.x ||
                b.x + MAP_LABEL_WIDTH + gap <= a.x ||
                a.y + MAP_LABEL_HEIGHT + gap <= b.y ||
                b.y + MAP_LABEL_HEIGHT + gap <= a.y,
            ),
          )
        : undefined;
    // Crowded areas retain a clickable location dot instead of distant or overlapping text.
    placed.push(
      candidate
        ? { id: anchor.id, x: candidate.x, y: candidate.y, compact: false }
        : { id: anchor.id, x: anchor.x - 6, y: anchor.y - 6, compact: true },
    );
  }
  return placed;
}
