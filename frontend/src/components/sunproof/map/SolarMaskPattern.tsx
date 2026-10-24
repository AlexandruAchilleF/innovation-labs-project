import { useEffect, useId, useRef } from "react";
import { ROMANIA_BOUNDARY } from "@/lib/romania-map";
import { useMapApi } from "./MapCanvas";

const PANEL = [
  "        .-------------------.",
  "       /___/___/___/___/___/|",
  "      /___/___/___/___/___/ |",
  "     /___/___/___/___/___/  /",
  "    /___/___/___/___/___/  /",
  "   /===================/  /",
  "   '-------------------'/",
  "         /_/   \\_\\",
];

/** Sparse ASCII panels over the already opaque country mask; animation stays on the compositor. */
export function SolarMaskPattern() {
  const api = useMapApi();
  const svg = useRef<SVGSVGElement>(null);
  const cutout = useRef<SVGPathElement>(null);
  const id = `solar-mask-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    if (!api || !svg.current || !cutout.current) return;
    const element = svg.current;
    const path = cutout.current;
    const { map } = api;
    let hasExterior = false;
    let inView = true;
    const playback = () => {
      element.style.animationPlayState =
        document.hidden || !inView || !hasExterior ? "paused" : "running";
    };
    const update = () => {
      const { clientWidth: w, clientHeight: h } = map.getContainer();
      const rings = ROMANIA_BOUNDARY.geometry.coordinates.map((ring) =>
        ring.map(([lon, lat]) => map.project([lon!, lat!])),
      );
      element.setAttribute("viewBox", `0 0 ${w} ${h}`);
      path.setAttribute(
        "d",
        `M0 0H${w}V${h}H0Z ${rings.map((ring) => ring.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join("") + "Z").join(" ")}`,
      );
      // If the country border cannot cross the viewport and its centre is inside,
      // the entire view is Romanian territory: no decorative animation is needed.
      let centreInside = false;
      let borderInView = false;
      const ring = rings[0]!;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i]!,
          b = ring[j]!;
        if (
          a.y > h / 2 !== b.y > h / 2 &&
          w / 2 < ((b.x - a.x) * (h / 2 - a.y)) / (b.y - a.y) + a.x
        )
          centreInside = !centreInside;
        if (
          Math.max(a.x, b.x) >= 0 &&
          Math.min(a.x, b.x) <= w &&
          Math.max(a.y, b.y) >= 0 &&
          Math.min(a.y, b.y) <= h
        )
          borderInView = true;
      }
      hasExterior = w > 0 && h > 0 && (borderInView || !centreInside);
      element.style.display = hasExterior ? "block" : "none";
      playback();
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? undefined
        : new IntersectionObserver(([entry]) => {
            inView = entry?.isIntersecting ?? false;
            playback();
          });
    observer?.observe(element);
    update();
    map.on("move", update);
    map.on("resize", update);
    document.addEventListener("visibilitychange", playback);
    return () => {
      observer?.disconnect();
      map.off("move", update);
      map.off("resize", update);
      document.removeEventListener("visibilitychange", playback);
    };
  }, [api]);

  return (
    <svg
      ref={svg}
      className="solar-mask-pattern pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <pattern id={id} width={512} height={512} patternUnits="userSpaceOnUse">
          {[
            [40, 44],
            [296, 300],
          ].map(([x, y]) => (
            <text
              key={`${x}-${y}`}
              x={x}
              y={y}
              fill="var(--smoke)"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
              fontSize={10}
              xmlSpace="preserve"
              style={{ whiteSpace: "pre" }}
            >
              {PANEL.map((line, i) => (
                <tspan key={i} x={x} dy={i ? 11 : 0}>
                  {line}
                </tspan>
              ))}
            </text>
          ))}
        </pattern>
      </defs>
      <path ref={cutout} fill={`url(#${id})`} fillRule="evenodd" />
    </svg>
  );
}
