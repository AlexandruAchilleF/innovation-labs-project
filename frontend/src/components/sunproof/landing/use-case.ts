import { useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { householdQuery } from "@/lib/queries";
import type { HouseholdAnalysis } from "@/lib/types";

/** The demo household behind a chapter, once hydrated (server render shows the skeleton). */
export function useCase(id: string): HouseholdAnalysis | undefined {
  const hydrated = useHydrated();
  const d = useQuery(householdQuery(id)).data;
  return hydrated ? d?.analysis : undefined;
}
