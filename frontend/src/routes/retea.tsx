import { createFileRoute, redirect } from "@tanstack/react-router";

// The LV grid view now lives on the map workspace (feeders, congestion and the what-if simulator).
export const Route = createFileRoute("/retea")({
  validateSearch: (s: Record<string, unknown>) => ({
    n: typeof s["n"] === "string" ? (s["n"] as string) : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/harta",
      search: { household: "RO-TM-001", ...(search.n ? { n: search.n } : {}) },
    });
  },
});
