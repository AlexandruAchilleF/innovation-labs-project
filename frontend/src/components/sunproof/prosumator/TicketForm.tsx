import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { TICKET_TOPICS, defaultTopic } from "@/lib/case-summary";
import { createTicket, openTicketFor, useTickets, type Ticket } from "@/lib/tickets";
import type { HouseholdDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Block 3: the homeowner sends the detected problem, with the SunProof diagnosis, to the supplier. */
export function TicketForm({ d }: { d: HouseholdDetail }) {
  const a = d.analysis;
  const existing = openTicketFor(useTickets(), a.household_id);
  const [topic, setTopic] = useState<string>(defaultTopic(d));
  const [message, setMessage] = useState(d.scenario.customer_question_ro);
  const [attach, setAttach] = useState(true);
  const [sent, setSent] = useState<Ticket | null>(null);
  const ticket = sent ?? existing;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSent(
      createTicket({
        household_id: a.household_id,
        customer_name: a.customer_name,
        city: a.city,
        scenario_badge_ro: d.scenario.scenario_badge_ro,
        topic_ro: topic,
        message_ro: message,
        attach_diagnostic: attach,
      }),
    );
  };

  return (
    <section
      aria-labelledby="ticket-title"
      className="rounded-lg border border-border bg-card p-6 sm:p-8"
    >
      <h2 id="ticket-title" className="font-display text-[24px] leading-tight text-bone">
        Trimite tichet către furnizor
      </h2>
      {ticket ? (
        <div className="mt-5 space-y-4" role="status">
          <p className="flex items-center gap-2 text-[16px] text-bone">
            <Check className="size-4 text-success" />
            Tichet <span className="num">#{ticket.ticket_id}</span>{" "}
            {sent ? "trimis către furnizor." : "deschis — furnizorul îl are deja."}
          </p>
          <p className="max-w-[70ch] text-[14px] text-fog">
            {ticket.topic_ro} · „{ticket.message_ro}”
          </p>
          <Link
            to="/harta"
            search={{ household: a.household_id }}
            className="inline-flex h-10 items-center gap-2 rounded-[4px] border border-bone px-4 text-[14px] font-medium text-bone transition-colors hover:bg-slate"
          >
            Vezi tichetul în Dashboard-ul Furnizorului <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-5">
          <fieldset>
            <legend className="text-[13px] text-fog">Problema</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {TICKET_TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={topic === t}
                  onClick={() => setTopic(t)}
                  className={cn(
                    "rounded-[4px] border px-3 py-1.5 text-[13px] transition-colors",
                    topic === t
                      ? "border-voltage text-bone"
                      : "border-iron text-fog hover:text-bone",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="text-[13px] text-fog">Mesajul tău</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={2000}
              className="mt-2 w-full resize-y rounded-[4px] border border-iron bg-graphite p-3 text-[14px] leading-relaxed text-bone outline-none placeholder:text-smoke focus:border-voltage"
            />
          </label>
          <label className="flex items-center gap-3 text-[14px] text-bone">
            <Checkbox checked={attach} onCheckedChange={(v) => setAttach(v === true)} />
            Atașează automat măsurătorile și diagnosticul SunProof
          </label>
          <button
            type="submit"
            disabled={!message.trim()}
            className="h-11 rounded-[4px] border border-bone bg-bone px-6 text-[14px] font-medium text-obsidian transition-colors hover:bg-bone/85 disabled:opacity-50"
          >
            Trimite tichetul către Furnizor
          </button>
        </form>
      )}
    </section>
  );
}
