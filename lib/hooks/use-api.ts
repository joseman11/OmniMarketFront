"use client";

import useSWR from "swr";
import { api } from "@/lib/api/client";
import type { AnalyticsFilters } from "@/lib/api/schemas";

export type AnalyticsQuery = { page: number; limit: number } & AnalyticsFilters;

/** Tabla paginada en servidor. Expone latencia de la última petición. */
export function useAnalytics(q: AnalyticsQuery) {
  return useSWR(["analytics", q.page, q.limit, q.from ?? "", q.to ?? "", q.categoryId ?? ""], () => api.getAnalytics(q));
}

/** Serie completa del rango para gráficas/KPIs (una sola página grande). */
export function useAnalyticsSeries(filters: AnalyticsFilters = {}) {
  return useSWR(["analytics-series", filters.from ?? "", filters.to ?? "", filters.categoryId ?? ""], () =>
    api.getAnalyticsSeries(filters).then((r) => r.data.data),
  );
}

export function useKanbanBoard() {
  return useSWR("kanban-board", () => api.getKanbanStatus().then((r) => r.data), {
    revalidateOnFocus: true,
  });
}

export function useCategories() {
  return useSWR("categories", () => api.getCategories());
}

export function useProducts(includeInactive = false) {
  return useSWR(["products", includeInactive], () => api.getProducts({ includeInactive }));
}
