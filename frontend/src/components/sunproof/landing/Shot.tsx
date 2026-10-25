import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ShotProps = {
  src: string;
  alt: string;
  /** Intrinsic pixel size of the webp: fixes the aspect ratio and the overlay viewBox. */
  w: number;
  h: number;
  className?: string;
  /** Absolutely positioned layer drawn over the screenshot in image pixel space. */
  overlay?: ReactNode;
  priority?: boolean;
  style?: CSSProperties;
};

/** A real app screenshot in a hairline window frame; effects are layered on top, never baked in. */
export function Shot({ src, alt, w, h, className, overlay, priority, style }: ShotProps) {
  return (
    <figure
      style={style}
      className={cn(
        "relative overflow-hidden rounded-[8px] border border-pewter bg-obsidian",
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        width={w}
        height={h}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="block h-auto w-full select-none"
        draggable={false}
      />
      {overlay}
    </figure>
  );
}

/** SVG overlay sharing the screenshot's pixel coordinates. */
export function Overlay({
  w,
  h,
  children,
  label,
}: {
  w: number;
  h: number;
  children: ReactNode;
  label?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {children}
    </svg>
  );
}

/** Two-state segmented switch used by the chapters (rețea/local, blocată/corectată). */
export function Toggle<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex w-fit rounded-[4px] border border-iron bg-obsidian p-0.5"
    >
      {options.map(([v, text]) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "h-8 rounded-[3px] px-3 text-[13px] transition-colors",
            value === v ? "bg-iron text-bone" : "text-fog hover:text-bone",
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
