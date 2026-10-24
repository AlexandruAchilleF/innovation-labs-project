import { Check, Inbox } from "lucide-react";
import { ticketDate } from "@/components/sunproof/shell/TicketsPopover";
import { openTicketFor, resolveTicket, useTickets } from "@/lib/tickets";

/** Open ticket sent by this client from the prosumer app; resolved by hand or by the case action. */
export function ClientTicketBox({ householdId }: { householdId: string }) {
  const t = openTicketFor(useTickets(), householdId);
  if (!t) return null;
  return (
    <section
      aria-label="Tichet deschis de client"
      className="rounded-lg border border-voltage/60 bg-graphite p-3"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-bone">
          <Inbox className="size-3.5 text-voltage" strokeWidth={1.5} />
          Tichet deschis de client
        </span>
        <span className="num text-[11px] text-fog">
          #{t.ticket_id} · {ticketDate(t.created_at)}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-fog">
        {t.topic_ro}
        {t.attach_diagnostic && " · diagnostic SunProof atașat"}
      </p>
      <p className="mt-2 text-[13px] leading-snug text-bone">„{t.message_ro}”</p>
      <button
        onClick={() => resolveTicket(t.ticket_id)}
        className="mt-3 flex h-8 items-center gap-1.5 rounded-[4px] border border-iron px-3 text-[12.5px] text-bone transition-colors hover:bg-slate"
      >
        <Check className="size-3.5 text-fog" /> Marchează ca rezolvat
      </button>
    </section>
  );
}
