import { Check } from "lucide-react";
import { openTicketFor, resolveTicket, useTickets } from "@/lib/tickets";

/** Open ticket sent by this client: the client's own words and a resolve button. */
export function ClientTicketBox({ householdId }: { householdId: string }) {
  const t = openTicketFor(useTickets(), householdId);
  if (!t) return null;
  return (
    <section
      aria-label="Tichet deschis de client"
      className="flex items-start gap-3 border-l-2 border-voltage pl-3"
    >
      <p className="flex-1 text-[13px] leading-snug text-bone">„{t.message_ro}”</p>
      <button
        onClick={() => resolveTicket(t.ticket_id)}
        title="Marchează ca rezolvat"
        aria-label="Marchează tichetul ca rezolvat"
        className="shrink-0 rounded-[4px] p-1 text-fog transition-colors hover:bg-slate hover:text-bone"
      >
        <Check className="size-4" />
      </button>
    </section>
  );
}
