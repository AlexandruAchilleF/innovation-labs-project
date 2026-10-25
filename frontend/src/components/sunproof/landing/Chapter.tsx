import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "./motion";

/** One question per chapter: index + question on one side, the live screenshot stage on the other. */
export function Chapter({
  index,
  title,
  control,
  reverse,
  children,
}: {
  index: string;
  title: string;
  control?: ReactNode;
  reverse?: boolean;
  children: ReactNode;
}) {
  const [ref, seen] = useInView<HTMLLIElement>(0.2);
  return (
    <li
      ref={ref}
      className="grid items-center gap-10 py-16 first:pt-0 last:pb-0 lg:grid-cols-12 lg:gap-16 lg:py-28"
    >
      <div
        className={cn(
          "flex flex-col gap-6 lg:col-span-4",
          reverse && "lg:order-2",
          seen && "lp-rise",
        )}
      >
        <span className="num text-[13px] text-voltage">{index}</span>
        <h3 className="font-display text-balance text-[30px] leading-[1.15] sm:text-[38px]">
          {title}
        </h3>
        {control}
      </div>
      <div
        className={cn("relative lg:col-span-8", reverse && "lg:order-1", seen && "lp-rise")}
        style={{ "--lp-delay": "0.15s" } as React.CSSProperties}
      >
        {children}
      </div>
    </li>
  );
}
