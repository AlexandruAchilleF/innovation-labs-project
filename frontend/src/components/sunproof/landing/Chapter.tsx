import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useInView } from "./motion";

/** One label/value row of a chapter verdict; the value is always a number the engine computed. */
export type Fact = [label: string, value: string];

/**
 * One question per chapter: the question and the engine's verdict stay pinned on one side while the
 * live screenshot stage scrolls on the other.
 */
export function Chapter({
  index,
  title,
  control,
  facts,
  reverse,
  children,
}: {
  index: string;
  title: string;
  control?: ReactNode;
  facts?: Fact[] | undefined;
  reverse?: boolean;
  children: ReactNode;
}) {
  const [ref, seen] = useInView<HTMLLIElement>(0.2);
  return (
    <li
      ref={ref}
      className="grid gap-10 py-16 first:pt-0 last:pb-0 lg:grid-cols-12 lg:gap-16 lg:py-24"
    >
      <div
        className={cn(
          "flex flex-col gap-6 self-start lg:sticky lg:top-24 lg:col-span-4",
          reverse && "lg:order-2",
          seen && "lp-rise",
        )}
      >
        <span className="num text-[13px] text-smoke">{index}</span>
        <h3 className="font-display text-balance text-[30px] leading-[1.15] sm:text-[36px]">
          {title}
        </h3>
        {control}
        <Verdict facts={facts} />
      </div>
      <div
        className={cn("relative lg:col-span-8", reverse && "lg:order-1", seen && "lp-rise")}
        style={{ "--lp-delay": "0.1s" } as React.CSSProperties}
      >
        {children}
      </div>
    </li>
  );
}

function Verdict({ facts }: { facts?: Fact[] | undefined }) {
  if (!facts) return <Skeleton className="h-[108px]" />;
  return (
    <dl className="divide-y divide-iron border-y border-iron">
      {facts.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-[13px] text-fog">{label}</dt>
          <dd className="num shrink-0 text-[14px] text-bone">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
