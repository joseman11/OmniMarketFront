import type { z } from "zod";
import {
  analyticsResponseSchema,
  apiErrorSchema,
  bulkUpdateInputSchema,
  bulkUpdateResponseSchema,
  categoryInputSchema,
  categoryMutationResponseSchema,
  categoriesResponseSchema,
  createOrderInputSchema,
  kanbanCardSchema,
  kanbanStatusResponseSchema,
  moveOrderInputSchema,
  orderMutationResponseSchema,
  orderDetailResponseSchema,
  ordersResponseSchema,
  paginationSchema,
  productDetailResponseSchema,
  productInputSchema,
  productMutationResponseSchema,
  productsResponseSchema,
  resetDataResponseSchema,
  type AnalyticsFilters,
  type BackendOrder,
  type BulkUpdateInput,
  type CategoryInput,
  type CreateOrderInput,
  type KanbanBoard,
  type MoveOrderInput,
  type ProductInput,
  type UpdateOrderItemsInput,
  ORDER_STATUSES,
  updateOrderItemsInputSchema,
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

export type ApiResult<T> = { data: T; status: number; latencyMs: number; raw: unknown };

function errorMessage(body: unknown, status: number) {
  const parsed = apiErrorSchema.safeParse(body);
  if (parsed.success) {
    if (typeof parsed.data.error === "string") return parsed.data.error;
    if (parsed.data.error?.message) return parsed.data.error.message;
    if (parsed.data.message) return parsed.data.message;
  }
  return `La solicitud falló (HTTP ${status})`;
}

async function request<S extends z.ZodTypeAny>(req: TransportRequest, schema: S): Promise<ApiResult<z.output<S>>> {
  const res = await transport(req);
  if (res.status < 200 || res.status >= 300) {
    throw new ApiError(errorMessage(res.body, res.status), res.status, res.latencyMs, res.body);
  }
  const parsed = schema.safeParse(res.body);
  if (!parsed.success) {
    console.error("[api] Respuesta fuera de contrato", req.path, parsed.error.flatten());
    throw new ApiError("La respuesta del servidor no coincide con el contrato esperado", res.status, res.latencyMs, res.body);
  }
  return { data: parsed.data, status: res.status, latencyMs: res.latencyMs, raw: res.body };
}

async function requestNoContent(req: TransportRequest): Promise<ApiResult<null>> {
  const res = await transport(req);
  if (res.status < 200 || res.status >= 300) {
    throw new ApiError(errorMessage(res.body, res.status), res.status, res.latencyMs, res.body);
  }
  return { data: null, status: res.status, latencyMs: res.latencyMs, raw: res.body };
}

function toCard(order: BackendOrder) {
  return kanbanCardSchema.parse({
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customer.name,
    total: order.total,
    margin: order.margin,
    position: order.position,
    version: order.version,
    status: order.status,
    updatedAt: order.updatedAt,
  });
}

async function getOrderPage(page: number, signal?: AbortSignal) {
  return request(
    { method: "GET", path: "/api/orders", query: { page, limit: 100 }, signal },
    ordersResponseSchema,
  );
}

type ProductQuery = { includeInactive?: boolean; categoryId?: string; search?: string };

async function getProductPage(page: number, options: ProductQuery = {}, signal?: AbortSignal) {
  return request(
    {
      method: "GET",
      path: "/api/products",
      query: {
        page,
        limit: 100,
        active: options.includeInactive ? undefined : "true",
        categoryId: options.categoryId,
        search: options.search,
      },
      signal,
    },
    productsResponseSchema,
  );
}

async function getAllOrders(signal?: AbortSignal) {
  const first = await getOrderPage(1, signal);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.data.pagination.totalPages - 1) }, (_, index) => getOrderPage(index + 2, signal)),
  );
  return { orders: [...first.data.items, ...rest.flatMap((page) => page.data.items)], pages: [first, ...rest] };
}

async function getAnalyticsPages(filters: AnalyticsFilters, limit: number) {
  const first = await request(
    { method: "GET", path: "/api/analytics", query: { page: 1, limit, from: filters.from, to: filters.to, categoryId: filters.categoryId } },
    analyticsResponseSchema,
  );
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.data.meta.totalPages - 1) }, (_, index) =>
      request(
        {
          method: "GET",
          path: "/api/analytics",
          query: { page: index + 2, limit, from: filters.from, to: filters.to, categoryId: filters.categoryId },
        },
        analyticsResponseSchema,
      ),
    ),
  );
  return [first, ...rest];
}

export const api = {
  getAnalytics(params: { page: number; limit: number } & AnalyticsFilters, signal?: AbortSignal) {
    const { page, limit } = paginationSchema.parse(params);
    return request(
      {
        method: "GET",
        path: "/api/analytics",
        query: { page, limit, from: params.from, to: params.to, categoryId: params.categoryId },
        signal,
      },
      analyticsResponseSchema,
    );
  },

  async getAnalyticsSeries(filters: AnalyticsFilters = {}) {
    const pages = await getAnalyticsPages(filters, 100);
    const first = pages[0]!;
    return {
      ...first,
      data: { ...first.data, data: pages.flatMap((page) => page.data.data) },
      latencyMs: pages.reduce((sum, page) => sum + page.latencyMs, 0),
      raw: pages.map((page) => page.raw),
    };
  },

  async getKanbanStatus(signal?: AbortSignal): Promise<ApiResult<KanbanBoard>> {
    const { orders, pages } = await getAllOrders(signal);
    const result = kanbanStatusResponseSchema.parse({
      columns: ORDER_STATUSES.map((status) => {
        const cards = orders
          .filter((order) => order.status === status)
          .map(toCard)
          .sort((left, right) => left.position - right.position);
        return { status, count: cards.length, cards };
      }),
    });
    return {
      data: result,
      status: pages[0]!.status,
      latencyMs: pages.reduce((sum, page) => sum + page.latencyMs, 0),
      raw: pages.map((page) => page.raw),
    };
  },

  getCategories(signal?: AbortSignal) {
    return request({ method: "GET", path: "/api/categories", signal }, categoriesResponseSchema);
  },

  async getProducts(options: ProductQuery = {}, signal?: AbortSignal) {
    const first = await getProductPage(1, options, signal);
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, first.data.pagination.totalPages - 1) }, (_, index) => getProductPage(index + 2, options, signal)),
    );
    return {
      ...first,
      data: { ...first.data, items: [...first.data.items, ...rest.flatMap((page) => page.data.items)] },
      latencyMs: [first, ...rest].reduce((sum, page) => sum + page.latencyMs, 0),
      raw: [first, ...rest].map((page) => page.raw),
    };
  },

  createCategory(input: CategoryInput) {
    return request(
      { method: "POST", path: "/api/categories", body: categoryInputSchema.parse(input) },
      categoryMutationResponseSchema,
    );
  },

  updateCategory(id: string, input: CategoryInput) {
    return request(
      { method: "PATCH", path: `/api/categories/${encodeURIComponent(id)}`, body: categoryInputSchema.parse(input) },
      categoryMutationResponseSchema,
    );
  },

  deleteCategory(id: string) {
    return requestNoContent({ method: "DELETE", path: `/api/categories/${encodeURIComponent(id)}` });
  },

  getProduct(id: string) {
    return request(
      { method: "GET", path: `/api/products/${encodeURIComponent(id)}` },
      productDetailResponseSchema,
    );
  },

  createProduct(input: ProductInput) {
    return request(
      { method: "POST", path: "/api/products", body: productInputSchema.parse(input) },
      productMutationResponseSchema,
    );
  },

  updateProduct(id: string, input: ProductInput) {
    return request(
      { method: "PATCH", path: `/api/products/${encodeURIComponent(id)}`, body: productInputSchema.parse(input) },
      productMutationResponseSchema,
    );
  },

  deleteProduct(id: string) {
    return requestNoContent({ method: "DELETE", path: `/api/products/${encodeURIComponent(id)}` });
  },

  getOrder(id: string) {
    return request(
      { method: "GET", path: `/api/orders/${encodeURIComponent(id)}` },
      orderDetailResponseSchema,
    );
  },

  updateOrderItems(id: string, input: UpdateOrderItemsInput) {
    const parsed = updateOrderItemsInputSchema.parse(input);
    return request(
      { method: "PATCH", path: `/api/orders/${encodeURIComponent(id)}`, body: parsed },
      orderDetailResponseSchema,
    );
  },

  deleteOrder(id: string) {
    return requestNoContent({ method: "DELETE", path: `/api/orders/${encodeURIComponent(id)}` });
  },

  resetData() {
    return request({ method: "POST", path: "/api/internal/test-reset" }, resetDataResponseSchema);
  },

  moveOrder(id: string, input: MoveOrderInput) {
    return request(
      {
        method: "PATCH",
        path: `/api/orders/${encodeURIComponent(id)}/status`,
        body: {
          status: moveOrderInputSchema.parse(input).toStatus,
          position: input.toPosition,
          expectedVersion: input.version,
        },
      },
      orderMutationResponseSchema.transform(({ item }) => toCard(item)),
    );
  },

  createOrder(input: CreateOrderInput) {
    const parsed = createOrderInputSchema.parse(input);
    return request(
      {
        method: "POST",
        path: "/api/orders",
        body: {
          customer: { name: parsed.customerName, email: parsed.customerEmail },
          items: parsed.items,
        },
      },
      orderMutationResponseSchema.transform(({ item }) => toCard(item)),
    );
  },

  bulkUpdate(input: BulkUpdateInput) {
    return request(
      {
        method: "PATCH",
        path: "/api/orders/bulk",
        body: { ids: bulkUpdateInputSchema.parse(input).ids, status: input.patch.status },
      },
      bulkUpdateResponseSchema.transform(({ updatedCount }) => ({ updated: updatedCount })),
    );
  },
};

export async function rawRequest(req: TransportRequest) {
  return transport(req);
}
