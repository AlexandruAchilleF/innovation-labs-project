import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/format";
import { Chapter, type Fact } from "./Chapter";
import { useCase } from "./use-case";
import { useInView } from "./motion";
import { Overlay, Shot } from "./Shot";

/** Pixel positions on /landing/bill-card.webp (747×741): the "Factura vs. contorul" block. */
const W = 747;
const H = 741;
const BLOCK = { x: 26, y: 400, w: 695, h: 166 };
const BAR = { x: 162, x2: 562, y: 528, h: 18 };

/**
 * (c) Reconciliation scan: a line sweeps the invoice card; when it crosses meter vs. invoice, the exported
 * quantity missing from the invoice is drawn as a ghost bar and the block is flagged.
 */
export function BillingChapter() {
  const [ref, seen] = useInView<HTMLDivElement>(0.5);
  const [run, setRun] = useState(0);
  const v = useCase("RO-BV-004")?.billing_verdict;
  const facts: Fact[] | undefined = v && [
    ["Export la contor", `${fmt(v.meter_export_kwh)} kWh`],
    ["Export pe factură", `${fmt(v.billed_export_kwh)} kWh`],
    ["Diferență", `${fmt(v.delta_ron, 2)} RON`],
  ];
  return (
    <Chapter
      index="03"
      title="Factura comparată cu indexul contorului"
      control={
        <button
          onClick={() => setRun((r) => r + 1)}
          className="inline-flex h-9 w-fit items-center gap-2 rounded-[4px] border border-iron px-3 text-[13px] text-fog transition-colors hover:border-pewter hover:text-bone"
        >
          <RotateCcw className="size-3.5" />
          Rulează din nou
        </button>
      }
      facts={facts}
    >
      <div ref={ref}>
        <Shot
          src="/landing/bill-card.webp"
          alt="Cardul lunar: contorul a înregistrat energie injectată care lipsește de pe factură"
          w={W}
          h={H}
          className="mx-auto w-[78%] sm:w-[58%]"
          overlay={seen && <Scan key={run} />}
        />
        <Shot
          src="/landing/bill-diag.webp"
          alt="Verdictul: index export lipsă pe factură, de corectat de furnizor"
          w={1400}
          h={239}
          className={cn(
            "relative z-10 -mt-[10%] ml-auto w-[92%] sm:-mr-6 lg:-mr-12",
            seen ? "lp-reveal" : "opacity-0",
          )}
          style={{ "--lp-delay": "2.2s" } as React.CSSProperties}
        />
      </div>
    </Chapter>
  );
}

function Scan() {
  const missing = BAR.x2 - BAR.x;
  return (
    <>
      <div
        aria-hidden
        className="lp-scan pointer-events-none absolute inset-x-0 top-0 h-px bg-voltage"
        style={{ "--lp-scan-to": "74000%" } as React.CSSProperties}
      />
      <Overlay w={W} h={H} label="Energia injectată lipsește de pe factură">
        <rect
          x={BLOCK.x}
          y={BLOCK.y}
          width={BLOCK.w}
          height={BLOCK.h}
          rx={6}
          fill="var(--critical-soft)"
          stroke="var(--critical)"
          strokeWidth={1.5}
          className="lp-reveal"
          style={{ "--lp-delay": "1.5s" } as React.CSSProperties}
        />
        <rect
          x={BAR.x}
          y={BAR.y}
          width={missing}
          height={BAR.h}
          rx={BAR.h / 2}
          fill="none"
          stroke="var(--critical)"
          strokeWidth={2}
          className="lp-draw"
          style={
            { "--lp-len": 2 * missing + 2 * BAR.h, "--lp-delay": "1.7s" } as React.CSSProperties
          }
        />
      </Overlay>
    </>
  );
}
