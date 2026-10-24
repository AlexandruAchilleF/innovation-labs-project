import { queryOptions } from "@tanstack/react-query";
import { api } from "./api";

export const portfolioQuery = () => queryOptions({ queryKey: ["portfolio"], queryFn: api.portfolio, staleTime: 60_000 });
export const householdQuery = (id: string) =>
  queryOptions({ queryKey: ["household", id], queryFn: () => api.household(id), staleTime: 60_000 });
export const neighborhoodsQuery = () => queryOptions({ queryKey: ["neighborhoods"], queryFn: api.neighborhoods, staleTime: 60_000 });
