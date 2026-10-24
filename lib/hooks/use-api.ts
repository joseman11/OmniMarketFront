"use client";

import useSWR, { type SWRConfiguration } from "swr";
import { api } from "@/lib/api/client";
import type { AnalyticsFilters } from "@/lib/api/schemas";

export type AnalyticsQuery = { page: number; limit: number } & AnalyticsFilters;

/** Identidad del filtro semántico (sin paginación) al que pertenecen unos datos. */
export function analyticsFiltersKey(filters: AnalyticsFilters) {
  return [filters.from ?? "", filters.to ?? "", filters.categoryId ?? ""].join("|");
}

/**
 * Tabla paginada en servidor. Expone latencia de la última petición. Conserva la página
 * anterior mientras carga la siguiente (paginación deliberada); cada resultado lleva el
 * filtro al que pertenece para no mostrarlo bajo un filtro distinto.
 */
export function useAnalytics(q: AnalyticsQuery) {
  const filtersKey = analyticsFiltersKey(q);
  return useSWR(
    ["analytics", q.page, q.limit, q.from ?? "", q.to ?? "", q.categoryId ?? ""],
    () => api.getAnalytics(q).then((result) => ({ ...result, filtersKey })),
    { keepPreviousData: true },
  );
}

/** Serie completa del rango para gráficas/KPIs (una sola página grande). */
export function useAnalyticsSeries(filters: AnalyticsFilters = {}) {
  return useSWR(["analytics-series", filters.from ?? "", filters.to ?? "", filters.categoryId ?? ""], () =>
    api.getAnalyticsSeries(filters).then((r) => r.data.data),
  );
}

/** Cualquier cambio de pedidos recalcula las métricas: usar con `mutate` global para refrescar KPIs y gráficas. */
export const isAnalyticsKey = (key: unknown) =>
  Array.isArray(key) && (key[0] === "analytics" || key[0] === "analytics-series");

export function useKanbanBoard(config?: Pick<SWRConfiguration, "isPaused">) {
  return useSWR("kanban-board", () => api.getKanbanStatus().then((r) => r.data), {
    revalidateOnFocus: true,
    ...config,
  });
}

export function useCategories() {
  return useSWR("categories", () => api.getCategories());
}

export function useProducts(includeInactive = false) {
  return useSWR(["products", includeInactive], () => api.getProducts({ includeInactive }));
}

/**
 * Detalle de producto seleccionado por ID. SWR aísla la respuesta por clave: la respuesta
 * tardía de A nunca se muestra para B, y no se conserva el producto anterior al cambiar.
 * La caché ya tiene alcance de sesión (SessionScope).
 */
export function useProductDetail(productId: string | null) {
  return useSWR(
    productId ? (["product-detail", productId] as const) : null,
    ([, id]) => api.getProduct(id).then((result) => result.data.item),
    { keepPreviousData: false },
  );
}
