import type { z } from "zod";
import {
  analyticsResponseSchema,
  apiErrorSchema,
  bulkUpdateInputSchema,
  bulkUpdateResponseSchema,
  createOrderInputSchema,
  kanbanCardSchema,
  kanbanStatusResponseSchema,
  moveOrderInputSchema,
  paginationSchema,
  resetDataResponseSchema,
  type AnalyticsFilters,
  type BulkUpdateInput,
  type CreateOrderInput,
  type MoveOrderInput,
} from "./schemas";
import { transport, type TransportRequest } from "./transport";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly latencyMs: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
  get isConflict() {
    return this.status === 409;
  }
}

export type ApiResult<T> = {
  data: T;
  status: number;
  latencyMs: number;
  raw: unknown;
};

/**
 * Frontera con el backend: toda respuesta se PARSEA con Zod.
 * Si el contrato cambia, sólo se ajustan los schemas en ./schemas.ts.
 */
async function request<S extends z.ZodTypeAny>(
  req: TransportRequest,
  schema: S,
): Promise<ApiResult<z.output<S>>> {
  const res = await transport(req);
  if (res.status < 200 || res.status >= 300) {
    const parsed = apiErrorSchema.safeParse(res.body);
    const msg =
      (parsed.success && (parsed.data.error ?? parsed.data.message)) ||
      `La solicitud falló (HTTP ${res.status})`;
    throw new ApiError(msg, res.status, res.latencyMs, res.body);
  }
  const parsed = schema.safeParse(res.body);
  if (!parsed.success) {
    console.error("[api] Respuesta fuera de contrato", req.path, parsed.error.flatten());
    throw new ApiError(
      "La respuesta del servidor no coincide con el contrato esperado",
      res.status,
      res.latencyMs,
      res.body,
    );
  }
  return { data: parsed.data, status: res.status, latencyMs: res.latencyMs, raw: res.body };
}

export const api = {
  getAnalytics(params: { page: number; limit: number } & AnalyticsFilters, signal?: AbortSignal) {
    const { page, limit } = paginationSchema.parse(params);
    return request(
      {
        method: "GET",
        path: "/api/test/analytics",
        query: { page, limit, from: params.from, to: params.to, categoryId: params.categoryId },
        signal,
      },
      analyticsResponseSchema,
    );
  },

  getKanbanStatus(signal?: AbortSignal) {
    return request({ method: "GET", path: "/api/test/kanban-status", signal }, kanbanStatusResponseSchema);
  },

  resetData() {
    return request({ method: "POST", path: "/api/test/reset-data" }, resetDataResponseSchema);
  },

  moveOrder(id: string, input: MoveOrderInput) {
    return request(
      {
        method: "PATCH",
        path: `/api/orders/${encodeURIComponent(id)}/move`,
        body: moveOrderInputSchema.parse(input),
      },
      kanbanCardSchema,
    );
  },

  createOrder(input: CreateOrderInput) {
    return request(
      { method: "POST", path: "/api/orders", body: createOrderInputSchema.parse(input) },
      kanbanCardSchema,
    );
  },

  bulkUpdate(input: BulkUpdateInput) {
    return request(
      { method: "POST", path: "/api/orders/bulk", body: bulkUpdateInputSchema.parse(input) },
      bulkUpdateResponseSchema,
    );
  },
};
