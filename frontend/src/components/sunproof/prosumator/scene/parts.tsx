import { Box, iso, path, pts, type P3 } from "./iso";

/** Equipment drawn in the isometric scene. Positions are world units (see iso.tsx). */

export const LAYOUT = {
  panels: { x: 0, y: 3, len: 7.2 },
  inverter: { at: [10.2, 5.9, 0] as P3, size: [2, 0.8, 2.6] as P3 },
  battery: { x: 4, y: 12, pitch: 1.9 },
  meter: { at: [12.8, 0.5, 1.4] as P3, size: [1.2, 0.5, 1.6] as P3 },
  house: { at: [10, -6.5, 0] as P3, size: [3.2, 3, 2.2] as P3 },
  pylon: { x: 23.4, y: 1.5 },
};

const LED = { OK: "var(--success)", DERATING: "var(--warning)", TRIP: "var(--critical)" } as const;

/** Tilted PV modules on stands; `glow` 0..1 brightens the glass with production. */
export function PanelArray({ count, glow }: { count: number; glow: number }) {
  const { x, y, len } = LAYOUT.panels;
  const rows = count > 6 ? 2 : 1;
  const per = Math.ceil(count / rows);
  const gap = 0.12;
  const pw = (len - gap * (per - 1)) / per;
  const out = [];
  // back row (lower y) first so the front row overlaps it
  for (let r = rows - 1; r >= 0; r--) {
    const y0 = y - r * 2.3;
    for (let i = 0; i < per && r * per + i < count; i++) {
      const x0 = x + i * (pw + gap);
      const lo = (u: number): P3 => [x0 + u, y0 + 1.6, 0.8];
      const hi = (u: number): P3 => [x0 + u, y0, 2.4];
      const at = (u: number, v: number): P3 => [x0 + u * pw, y0 + 1.6 - 1.6 * v, 0.8 + 1.6 * v];
      out.push(
        <g key={`${r}-${i}`}>
          <path d={path([lo(pw * 0.15), [x0 + pw * 0.15, y0 + 1.6, 0]])} stroke="var(--pewter)" />
          <path d={path([hi(pw * 0.85), [x0 + pw * 0.85, y0, 0]])} stroke="var(--pewter)" />
          <polygon
            points={pts([lo(0), lo(pw), hi(pw), hi(0)])}
            fill="var(--navy)"
            stroke="var(--fog)"
            strokeWidth={0.75}
          />
          {[1 / 3, 2 / 3].map((u) => (
            <path
              key={u}
              d={path([at(u, 0), at(u, 1)])}
              stroke="var(--voltage)"
              strokeOpacity={0.35}
              strokeWidth={0.5}
            />
          ))}
          {[0.25, 0.5, 0.75].map((v) => (
            <path
              key={v}
              d={path([at(0, v), at(1, v)])}
              stroke="var(--voltage)"
              strokeOpacity={0.35}
              strokeWidth={0.5}
            />
          ))}
          <polygon
            points={pts([at(0.05, 0.55), at(0.45, 0.95), at(0.7, 0.95), at(0.3, 0.55)])}
            fill="var(--bone)"
            opacity={0.04 + 0.16 * glow}
            className="transition-opacity duration-700"
          />
        </g>,
      );
    }
  }
  return <g>{out}</g>;
}

export function Inverter({ status }: { status: keyof typeof LED }) {
  const { at, size } = LAYOUT.inverter;
  return (
    <Box
      at={at}
      size={size}
      face={(f) => {
        const [cx, cy] = f.at(1, 0.65);
        return (
          <>
            <polygon points={f.quad(0.35, 1.35, 1.65, 2.2)} fill="var(--obsidian)" />
            <circle cx={cx} cy={cy} r={6} fill={LED[status]} opacity={0.18}>
              {status === "TRIP" && (
                <animate attributeName="r" values="5;10;5" dur="1.4s" repeatCount="indefinite" />
              )}
            </circle>
            <circle cx={cx} cy={cy} r={2.6} fill={LED[status]} stroke="none" />
          </>
        );
      }}
    />
  );
}

/** Battery modules with a state-of-charge gauge and the configured reserve as a dashed line. */
export function BatteryBank({
  modules,
  soc,
  reservePct,
  locked,
}: {
  modules: number;
  soc: number;
  reservePct: number;
  locked: boolean;
}) {
  const { x, y, pitch } = LAYOUT.battery;
  return (
    <g>
      {Array.from({ length: modules }, (_, i) => (
        <g key={i}>
          <Box
            at={[x + i * pitch, y, 0]}
            size={[1.5, 1.1, 1.5]}
            face={(f) => {
              const lv = 0.2 + 1.1 * (soc / 100);
              const rv = 0.2 + 1.1 * (reservePct / 100);
              return (
                <>
                  <polygon points={f.quad(0.3, 0.2, 1.2, 1.3)} fill="var(--obsidian)" />
                  <polygon
                    points={f.quad(0.3, 0.2, 1.2, lv)}
                    fill="var(--info)"
                    opacity={0.85}
                    className="transition-all duration-500"
                  />
                  {reservePct > 0 && (
                    <path
                      d={`M${f.at(0.22, rv).join(" ")} L${f.at(1.28, rv).join(" ")}`}
                      stroke={locked ? "var(--warning)" : "var(--fog)"}
                      strokeDasharray="2 2"
                      strokeWidth={1.2}
                    />
                  )}
                </>
              );
            }}
          />
          <Box
            at={[x + i * pitch + 0.25, y + 0.35, 1.5]}
            size={[0.25, 0.25, 0.18]}
            top="var(--fog)"
          />
          <Box
            at={[x + i * pitch + 1.0, y + 0.35, 1.5]}
            size={[0.25, 0.25, 0.18]}
            top="var(--fog)"
          />
        </g>
      ))}
    </g>
  );
}

export function Meter() {
  const { at, size } = LAYOUT.meter;
  const [x, y] = at;
  return (
    <g>
      <path
        d={path([
          [x + 0.6, y + 0.25, 0],
          [x + 0.6, y + 0.25, at[2]],
        ])}
        stroke="var(--pewter)"
        strokeWidth={2}
      />
      <Box
        at={at}
        size={size}
        face={(f) => <polygon points={f.quad(0.2, 0.9, 1.0, 1.35)} fill="var(--obsidian)" />}
      />
    </g>
  );
}

/** The house is the consumer; its windows light up with the load. */
export function House({ lit }: { lit: number }) {
  const {
    at: [x, y, z],
    size: [w, d, h],
  } = LAYOUT.house;
  const rz = h + 1.4;
  return (
    <g>
      <Box
        at={[x, y, z]}
        size={[w, d, h]}
        face={(f) => (
          <>
            {[0.35, 1.9].map((u) => (
              <polygon
                key={u}
                points={f.quad(u, 0.9, u + 0.8, 1.6)}
                fill="var(--sun)"
                opacity={0.12 + 0.6 * lit}
                className="transition-opacity duration-500"
              />
            ))}
          </>
        )}
      />
      <g stroke="var(--pewter)" strokeWidth={0.75} strokeLinejoin="round">
        <polygon
          points={pts([
            [x + w, y, h],
            [x + w, y + d, h],
            [x + w, y + d / 2, rz],
          ])}
          fill="var(--graphite)"
        />
        <polygon
          points={pts([
            [x - 0.15, y + d + 0.15, h],
            [x + w, y + d + 0.15, h],
            [x + w, y + d / 2, rz],
            [x - 0.15, y + d / 2, rz],
          ])}
          fill="var(--iron)"
        />
      </g>
    </g>
  );
}

/** Lattice transmission tower: the public grid, with wires leaving the scene. */
export function Pylon({ live }: { live: boolean }) {
  const { x, y } = LAYOUT.pylon;
  const b = 0.7;
  const t = 0.18;
  const H = 6.4;
  const leg = (sx: number, sy: number): P3[] => [
    [x + sx * b, y + sy * b, 0],
    [x + sx * t, y + sy * t, H],
  ];
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  const ring = (z: number, k: number) =>
    path(corners.map(([sx, sy]) => [x + sx * k, y + sy * k, z] as P3).concat([[x - k, y - k, z]]));
  const k = (z: number) => b + (t - b) * (z / H);
  const [wx, wy] = iso([x + 1.8, y, 5.2]);
  return (
    <g stroke="var(--fog)" strokeWidth={0.9} fill="none">
      {corners.map(([sx, sy]) => (
        <path key={`${sx}${sy}`} d={path(leg(sx, sy))} />
      ))}
      {[1.5, 3, 4.5].map((z) => (
        <path key={z} d={ring(z, k(z))} strokeOpacity={0.6} />
      ))}
      {[0, 1.5, 3].map((z) => (
        <path
          key={`x${z}`}
          d={path([
            [x - k(z), y + k(z), z],
            [x + k(z + 1.5), y + k(z + 1.5), z + 1.5],
          ])}
          strokeOpacity={0.45}
        />
      ))}
      {[5.2, 6.2].map((z) => (
        <path
          key={`a${z}`}
          d={path([
            [x - 1.8, y, z],
            [x + 1.8, y, z],
          ])}
        />
      ))}
      {[-1.8, 1.8].map((dx) => (
        <path
          key={dx}
          d={`M${iso([x + dx, y, 5.2]).join(" ")} Q ${iso([x + dx + 4, y - 4, 3.6]).join(" ")} ${iso([x + dx + 8, y - 8, 5.8]).join(" ")}`}
          strokeOpacity={0.5}
        />
      ))}
      <circle cx={wx} cy={wy} r={2} fill={live ? "var(--sky)" : "var(--pewter)"} stroke="none" />
    </g>
  );
}
