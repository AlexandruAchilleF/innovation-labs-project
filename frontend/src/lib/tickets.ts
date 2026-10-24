import { useMemo, useSyncExternalStore } from "react";
import { withFallback } from "./api";
import { mockHouseholdDetail } from "./mock/households";

/**
 * Customer tickets (prosumer → supplier). localStorage is the client source of truth (and syncs
 * open tabs through the `storage` event); the FastAPI `/api/tickets` endpoints are best-effort
 * persistence. Two tickets are seeded on flagship cases so the supplier inbox is never empty.
 */
export type TicketStatus = "OPEN" | "RESOLVED";

export interface Ticket {
  ticket_id: string;
  household_id: string;
  customer_name: string;
  city: string;
  scenario_badge_ro: string;
  topic_ro: string;
  message_ro: string;
  attach_diagnostic: boolean;
  created_at: string;
  status: TicketStatus;
  resolution_ro: string | null;
}

export type NewTicket = Pick<
  Ticket,
  | "household_id"
  | "customer_name"
  | "city"
  | "scenario_badge_ro"
  | "topic_ro"
  | "message_ro"
  | "attach_diagnostic"
>;

export const TICKETS_KEY = "sunproof.tickets.v1";
export const SEED_HOUSEHOLD_IDS = ["RO-TM-001", "RO-BV-004"] as const;
const SEED_CREATED_AT = "2026-08-14T09:30:00+00:00";
const EMPTY: Ticket[] = [];

/** Seeds mirror the backend: the customer's own question, no invented text or numbers. */
export function seedTickets(): Ticket[] {
  return SEED_HOUSEHOLD_IDS.map((id, i) => {
    const { analysis: a, scenario: s } = mockHouseholdDetail(id);
    return {
      ticket_id: `SP-${1001 + i}`,
      household_id: id,
      customer_name: a.customer_name,
      city: a.city,
      scenario_badge_ro: s.scenario_badge_ro,
      topic_ro: s.scenario_badge_ro,
      message_ro: s.customer_question_ro,
      attach_diagnostic: true,
      created_at: SEED_CREATED_AT,
      status: "OPEN",
      resolution_ro: null,
    };
  });
}

export function nextTicketId(list: Ticket[]): string {
  const max = Math.max(1002, ...list.map((t) => Number(t.ticket_id.replace(/\D/g, "")) || 0));
  return `SP-${max + 1}`;
}

/** Server copy wins for content; a ticket resolved on either side stays resolved. */
export function mergeTickets(local: Ticket[], server: Ticket[]): Ticket[] {
  const byId = new Map(local.map((t) => [t.ticket_id, t]));
  for (const s of server) {
    const l = byId.get(s.ticket_id);
    byId.set(
      s.ticket_id,
      l?.status === "RESOLVED" && s.status === "OPEN"
        ? { ...s, status: "RESOLVED", resolution_ro: l.resolution_ro }
        : s,
    );
  }
  return [...byId.values()].sort((x, y) => y.created_at.localeCompare(x.created_at));
}

// ---------- store ----------
let tickets: Ticket[] | null = null;
let synced = false;
const listeners = new Set<() => void>();

function parse(raw: string | null): Ticket[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as Ticket[]) : null;
  } catch {
    return null;
  }
}

function read(): Ticket[] {
  if (tickets) return tickets;
  tickets = parse(window.localStorage.getItem(TICKETS_KEY)) ?? mergeTickets([], seedTickets());
  return tickets;
}

function write(next: Ticket[]) {
  tickets = next;
  try {
    window.localStorage.setItem(TICKETS_KEY, JSON.stringify(next));
  } catch {
    // storage full or disabled: keep the in-memory copy
  }
  listeners.forEach((l) => l());
}

function syncFromServer() {
  if (synced) return;
  synced = true;
  void withFallback<Ticket[]>("/api/tickets", undefined, () => read()).then((server) => {
    if (Array.isArray(server)) write(mergeTickets(read(), server));
  });
}

function onStorage(e: StorageEvent) {
  if (e.key !== TICKETS_KEY) return;
  tickets = parse(e.newValue);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  syncFromServer();
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function useTickets(): Ticket[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useOpenTickets(): Ticket[] {
  const all = useTickets();
  return useMemo(() => all.filter((t) => t.status === "OPEN"), [all]);
}

export function openTicketFor(list: Ticket[], householdId: string): Ticket | undefined {
  return list.find((t) => t.household_id === householdId && t.status === "OPEN");
}

export function createTicket(input: NewTicket): Ticket {
  const ticket: Ticket = {
    ...input,
    message_ro: input.message_ro.trim(),
    ticket_id: nextTicketId(read()),
    created_at: new Date().toISOString(),
    status: "OPEN",
    resolution_ro: null,
  };
  write([ticket, ...read()]);
  const body = {
    household_id: ticket.household_id,
    message_ro: ticket.message_ro,
    attach_diagnostic: ticket.attach_diagnostic,
    ticket_id: ticket.ticket_id,
    topic_ro: ticket.topic_ro,
  };
  void withFallback("/api/tickets", { method: "POST", body: JSON.stringify(body) }, () => ticket);
  return ticket;
}

export function resolveTicket(ticketId: string, resolution = "Rezolvat de furnizor") {
  const list = read();
  if (!list.some((t) => t.ticket_id === ticketId && t.status === "OPEN")) return;
  write(
    list.map((t) =>
      t.ticket_id === ticketId
        ? { ...t, status: "RESOLVED" as const, resolution_ro: resolution }
        : t,
    ),
  );
  const init = { method: "POST", body: JSON.stringify({ resolution_ro: resolution }) };
  void withFallback(`/api/tickets/${ticketId}/resolve`, init, () => null);
}

/** Auto-resolution when the supplier acts on the case (PDF dossier, O&M alert). */
export function resolveOpenTicketsFor(householdId: string, resolution: string) {
  for (const t of read()) {
    if (t.household_id === householdId && t.status === "OPEN")
      resolveTicket(t.ticket_id, resolution);
  }
}

// test hook
export function __resetTickets() {
  tickets = null;
  synced = false;
}
