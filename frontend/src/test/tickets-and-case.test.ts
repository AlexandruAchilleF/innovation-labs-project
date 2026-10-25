import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetApiState } from "@/lib/api";
import { caseKind, defaultTopic, prosumerCause, supplierCase } from "@/lib/case-summary";
import { mockHouseholdDetail } from "@/lib/mock/households";
import {
  TICKETS_KEY,
  __resetTickets,
  createTicket,
  mergeTickets,
  nextTicketId,
  openTicketFor,
  resolveOpenTicketsFor,
  seedTickets,
  type Ticket,
} from "@/lib/tickets";

describe("ticket store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    __resetTickets();
    __resetApiState();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("seeds two open flagship tickets with the customer's own question", () => {
    const seeds = seedTickets();
    expect(seeds.map((t) => t.household_id)).toEqual(["RO-TM-001", "RO-BV-004"]);
    expect(seeds[0]!.message_ro).toBe(
      mockHouseholdDetail("RO-TM-001").scenario.customer_question_ro,
    );
    expect(seeds.every((t) => t.status === "OPEN")).toBe(true);
  });

  it("creates, persists and auto-resolves a ticket", () => {
    const t = createTicket({
      household_id: "RO-IF-002",
      customer_name: "Elena Ionescu",
      city: "Corbeanca",
      scenario_badge_ro: "Instalație locală",
      topic_ro: "Invertorul se oprește în orele de vârf ale producției solare",
      message_ro: "  De ce?  ",
      attach_diagnostic: true,
    });
    expect(t.ticket_id).toBe("SP-1003");
    expect(t.message_ro).toBe("De ce?");
    const stored = JSON.parse(window.localStorage.getItem(TICKETS_KEY)!) as Ticket[];
    expect(openTicketFor(stored, "RO-IF-002")?.ticket_id).toBe("SP-1003");

    resolveOpenTicketsFor("RO-IF-002", "Tehnician O&M alertat prin Telegram");
    const after = JSON.parse(window.localStorage.getItem(TICKETS_KEY)!) as Ticket[];
    expect(openTicketFor(after, "RO-IF-002")).toBeUndefined();
    expect(after.find((x) => x.ticket_id === "SP-1003")?.resolution_ro).toContain("Telegram");
  });

  it("keeps a locally resolved ticket resolved when the server still has it open", () => {
    const [seed] = seedTickets();
    const local = [{ ...seed!, status: "RESOLVED" as const, resolution_ro: "ok" }];
    const merged = mergeTickets(local, [{ ...seed!, message_ro: "server" }]);
    expect(merged[0]).toMatchObject({ status: "RESOLVED", message_ro: "server" });
    expect(nextTicketId(merged)).toBe("SP-1003");
  });
});

describe("case summary", () => {
  it("leads with the grid problem and its three engine numbers", () => {
    const d = mockHouseholdDetail("RO-TM-001");
    const sc = supplierCase(d);
    expect(sc.kind).toBe("grid");
    expect(sc.proof).toHaveLength(3);
    expect(sc.proof[1]!.value).toContain(`din ${d.analysis.grid_verdict.neighbors_total}`);
    expect(prosumerCause(d)).toContain("Panourile tale nu sunt stricate");
    expect(defaultTopic(d)).toBe("Invertorul se oprește în orele de vârf ale producției solare");
  });

  it("maps every flagship to its own kind", () => {
    const kinds = ["RO-TM-001", "RO-IF-002", "RO-CJ-003", "RO-BV-004", "RO-B-005"].map((id) =>
      caseKind(mockHouseholdDetail(id)),
    );
    expect(kinds).toEqual(["grid", "local", "battery", "billing", "billing_ok"]);
  });
});
