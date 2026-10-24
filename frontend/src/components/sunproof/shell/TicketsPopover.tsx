import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Inbox } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useOpenTickets, type Ticket } from "@/lib/tickets";

export const ticketDate = (iso: string) =>
  new Date(iso).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Supplier inbox: open customer tickets; a click opens the household on the map. */
export function TicketsPopover() {
  const open = useOpenTickets();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const go = (t: Ticket) => {
    setIsOpen(false);
    void navigate({ to: "/harta", search: { household: t.household_id } });
  };
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger className="flex h-8 items-center gap-2 rounded-[4px] border border-iron px-3 text-[13px] text-bone transition-colors hover:bg-slate">
        <Inbox className="size-3.5 text-fog" strokeWidth={1.5} />
        <span className="hidden sm:inline">Tichete Clienți</span>
        <span
          className={
            open.length
              ? "num rounded-[4px] border border-voltage px-1.5 text-[11px] text-bone"
              : "num rounded-[4px] border border-iron px-1.5 text-[11px] text-fog"
          }
          aria-label={`${open.length} tichete deschise`}
        >
          {open.length}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] border-iron bg-slate p-0">
        <div className="border-b border-iron px-4 py-3">
          <div className="text-[13px] font-medium text-bone">Tichete deschise de clienți</div>
          <p className="mt-0.5 text-[12px] text-fog">Trimise din aplicația prosumatorului.</p>
        </div>
        {open.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-fog">Niciun tichet deschis.</p>
        ) : (
          <ul className="max-h-[360px] divide-y divide-iron overflow-y-auto">
            {open.map((t) => (
              <li key={t.ticket_id}>
                <button
                  onClick={() => go(t)}
                  className="w-full px-4 py-3 text-left transition-colors hover:bg-iron"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] text-bone">
                      {t.customer_name} · {t.city}
                    </span>
                    <span className="num shrink-0 text-[11px] text-fog">{t.ticket_id}</span>
                  </div>
                  <div className="mt-0.5 text-[12px] text-fog">
                    {t.topic_ro} · {ticketDate(t.created_at)}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-bone/85">
                    „{t.message_ro}”
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
