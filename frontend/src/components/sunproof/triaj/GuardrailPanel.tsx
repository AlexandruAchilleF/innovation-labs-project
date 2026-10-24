import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FlaskConical, RotateCcw, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, hallucinatedText } from "@/lib/api";
import { fmt } from "@/lib/format";
import { extractNumbers, runGuardrail } from "@/lib/sim";
import type { GuardrailDocType, GuardrailResult, HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Panel } from "../primitives";

type Tab = GuardrailDocType | "call_center";

function Highlighted({ text, bad }: { text: string; bad: number[] }) {
  if (!bad.length) return <>{text}</>;
  const parts = text.split(/(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 && bad.includes(extractNumbers(p)[0] ?? NaN) ? (
          <mark
            key={i}
            className="num rounded-[2px] bg-transparent px-0.5 text-critical no-underline ring-1 ring-critical-border"
          >
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function GuardrailPanel({ d }: { d: HouseholdDetail }) {
  const a = d.analysis;
  const [tab, setTab] = useState<Tab>("invoice_explanation");
  const [sim, setSim] = useState<GuardrailResult | null>(null);
  useEffect(() => setSim(null), [tab, a.household_id]);
  const m = useMutation({
    mutationFn: (doc: GuardrailDocType) =>
      api.guardrail(a.household_id, doc, hallucinatedText(a.household_id, doc)),
    onSuccess: setSim,
  });

  const verified =
    tab === "invoice_explanation"
      ? a.invoice_explanation_text
      : tab === "distributor_complaint"
        ? a.distributor_complaint_text
        : tab === "battery_guide"
          ? a.battery_guide_text
          : a.call_center_script_text;
  const base = runGuardrail(verified, verified);
  const nums = sim ? sim.result.numbers_extracted_from_text : base.numbers_extracted_from_text;

  return (
    <Panel
      title="Scut determinist anti-halucinații"
      actions={
        <span
          className={cn(
            "flex items-center gap-1 text-[12px]",
            sim?.fallback_applied ? "text-warning" : "text-fog",
          )}
        >
          {sim?.fallback_applied ? (
            <ShieldAlert className="size-3.5" />
          ) : (
            <ShieldCheck className="size-3.5" />
          )}
          {sim?.fallback_applied ? "Fallback aplicat" : "Verificat"}
        </span>
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="h-8 w-full">
          <TabsTrigger value="invoice_explanation" className="text-[12px]">
            Explicație Factură
          </TabsTrigger>
          <TabsTrigger value="distributor_complaint" className="text-[12px]">
            Sesizare Distribuitor
          </TabsTrigger>
          <TabsTrigger value="battery_guide" className="text-[12px]">
            Ghid Baterie
          </TabsTrigger>
          <TabsTrigger value="call_center" className="text-[12px]">
            Script Call-Center
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {sim && (
        <div className="mt-4">
          <div className="mb-1 text-[12px] text-critical">
            Răspuns LLM interceptat · {sim.caught.length} număr neverificat
          </div>
          <p className="text-[12.5px] leading-relaxed text-fog">
            <Highlighted text={sim.input_text_ro} bad={sim.caught} />
          </p>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-1 text-[12px] text-fog">
          {sim ? "Text final · șablon determinist" : "Text verificat"}
        </div>
        <p className="max-w-[75ch] text-[13.5px] leading-relaxed text-bone">
          {sim ? sim.result.text_ro : verified}
        </p>
      </div>

      <details className="mt-3">
        <summary className="mb-1.5 cursor-pointer list-none text-[12px] text-fog hover:text-bone">
          Numere verificate ({nums.length})
        </summary>
        <div className="flex flex-wrap gap-1">
          {nums.map((n) => {
            const bad = sim?.caught.includes(n);
            return (
              <span
                key={n}
                className={cn(
                  "num rounded-[4px] border px-1.5 py-0.5 text-[11px]",
                  bad ? "border-critical-border text-critical" : "border-iron text-fog",
                )}
              >
                {fmt(n, Number.isInteger(n) ? 0 : 2)}
              </span>
            );
          })}
        </div>
      </details>

      <div className="mt-4 flex gap-2">
        {tab !== "call_center" && (
          <Button
            size="sm"
            variant="outline"
            className="border-iron bg-transparent text-bone hover:bg-slate"
            onClick={() => m.mutate(tab)}
            disabled={m.isPending}
          >
            <FlaskConical /> Simulează o halucinație LLM (+999 RON)
          </Button>
        )}
        {sim && (
          <Button size="sm" variant="ghost" onClick={() => setSim(null)}>
            <RotateCcw /> Resetează
          </Button>
        )}
      </div>
    </Panel>
  );
}
