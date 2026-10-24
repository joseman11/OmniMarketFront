import { z } from "zod";
import { parseDecimal } from "@/lib/decimal";

export const ORDER_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const decimalSchema = z
  .union([z.string(), z.number()])
  .refine((value) => !Number.isNaN(parseDecimal(value, Number.NaN)), { message: "Decimal inválido" })
  .transform((value) => parseDecimal(value));

const isoDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, "Fecha inválida")
  .transform((value) => value.slice(0, 10));

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const MAX_LIMIT = 100;
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT),
});
export type Pagination = z.infer<typeof paginationSchema>;

export const paginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});
export type ApiCategory = z.infer<typeof categorySchema>;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Escribe un nombre").max(100),
  slug: z.string().trim().min(1, "Escribe un slug").max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usa minúsculas, números y guiones"),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export const categoryMutationResponseSchema = z.object({ item: categorySchema });

const analyticsItemSchema = z.object({
  day: isoDaySchema,
  category: categorySchema,
  ordersCount: z.coerce.number().int().nonnegative(),
  revenue: decimalSchema,
  avgTicket: decimalSchema,
  grossMargin: decimalSchema,
});

const backendAnalyticsResponseSchema = z.object({
  summary: z.object({
    ordersCount: z.number().int().nonnegative(),
    revenue: decimalSchema,
    avgTicket: decimalSchema,
    grossMargin: decimalSchema,
  }),
  items: z.array(analyticsItemSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const analyticsResponseSchema = backendAnalyticsResponseSchema.transform(({ items, pagination, summary }) => ({
  data: items.map((item) => ({
    day: item.day,
    categoryId: item.category.id,
    categoryName: item.category.name,
    ordersCount: item.ordersCount,
    revenue: item.revenue,
    avgTicket: item.avgTicket,
    grossMargin: item.grossMargin,
  })),
  meta: {
    total: pagination.total,
    page: pagination.page,
    pageSize: pagination.limit,
    totalPages: pagination.totalPages,
  },
  summary,
}));
export type AnalyticsRow = {
  day: string;
  categoryId: string;
  categoryName: string;
  ordersCount: number;
  revenue: number;
  avgTicket: number;
  grossMargin: number;
};
export type AnalyticsResponse = z.infer<typeof analyticsResponseSchema>;

export const analyticsFiltersSchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    categoryId: z.string().min(1).optional(),
  })
  .refine((filters) => !filters.from || !filters.to || filters.from <= filters.to, {
    message: "La fecha inicial debe ser anterior a la final",
    path: ["to"],
  });
export type AnalyticsFilters = z.infer<typeof analyticsFiltersSchema>;

export const kanbanCardSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customerName: z.string(),
  total: decimalSchema,
  margin: decimalSchema,
  position: z.number().int().nonnegative(),
  version: z.number().int().positive(),
  status: orderStatusSchema,
  updatedAt: z.string().optional(),
});
export type KanbanCard = z.infer<typeof kanbanCardSchema>;

export const kanbanColumnSchema = z.object({
  status: orderStatusSchema,
  count: z.number().int().nonnegative(),
  cards: z.array(kanbanCardSchema),
});
export const kanbanStatusResponseSchema = z.object({ columns: z.array(kanbanColumnSchema) });
export type KanbanBoard = z.infer<typeof kanbanStatusResponseSchema>;

const productSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  categoryId: z.string(),
  category: categorySchema,
  price: decimalSchema,
  cost: decimalSchema,
  stock: z.number().int().nonnegative(),
  isActive: z.boolean(),
});
export type ApiProduct = z.infer<typeof productSchema>;

export const productInputSchema = z.object({
  categoryId: z.string().uuid("Selecciona una categoría válida"),
  sku: z.string().trim().min(1, "Escribe un SKU").max(80),
  name: z.string().trim().min(1, "Escribe un nombre").max(180),
  price: z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/, "Usa un importe positivo con hasta dos decimales"),
  cost: z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/, "Usa un importe positivo con hasta dos decimales"),
  stock: z.coerce.number().int().min(0).max(2_000_000),
  isActive: z.boolean(),
});
export type ProductInput = z.infer<typeof productInputSchema>;
export const productMutationResponseSchema = z.object({ item: productSchema });
export const productDetailResponseSchema = productMutationResponseSchema;

export const categoriesResponseSchema = z.object({ items: z.array(categorySchema) });
export const productsResponseSchema = z.object({
  items: z.array(productSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

const backendOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customer: z.object({ name: z.string(), email: z.string() }),
  total: decimalSchema,
  margin: decimalSchema,
  position: z.number().int().nonnegative(),
  version: z.number().int().positive(),
  status: orderStatusSchema,
  updatedAt: z.string(),
});
const orderPaginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export const ordersResponseSchema = z.object({ items: z.array(backendOrderSchema), pagination: orderPaginationSchema });
export const orderMutationResponseSchema = z.object({ item: backendOrderSchema });
export type BackendOrder = z.infer<typeof backendOrderSchema>;

const orderLineSchema = z.object({
  id: z.string(),
  productId: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: decimalSchema,
  unitCost: decimalSchema,
  product: productSchema,
});
const orderDetailSchema = backendOrderSchema.extend({
  createdAt: z.string(),
  customer: z.object({ name: z.string(), email: z.string(), city: z.string().nullable().optional() }),
  items: z.array(orderLineSchema),
});
export const orderDetailResponseSchema = z.object({ item: orderDetailSchema });
export type BackendOrderDetail = z.infer<typeof orderDetailSchema>;

export const resetDataResponseSchema = z.object({
  reset: z.literal(true),
  counts: z.object({ categories: z.number().int(), products: z.number().int(), orders: z.number().int() }),
});

export const moveOrderInputSchema = z.object({
  toStatus: orderStatusSchema,
  toPosition: z.number().int().nonnegative(),
  version: z.number().int().positive(),
});
export type MoveOrderInput = z.infer<typeof moveOrderInputSchema>;

export const bulkUpdateInputSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Selecciona al menos una orden").max(100),
  patch: z.object({ status: orderStatusSchema }),
});
export type BulkUpdateInput = z.infer<typeof bulkUpdateInputSchema>;
export const bulkUpdateResponseSchema = z.object({
  updatedCount: z.number().int().nonnegative(),
  ids: z.array(z.string()),
});

export const orderItemInputSchema = z.object({
  productId: z.string().min(1, "Selecciona un producto"),
  quantity: z.coerce.number().int().min(1, "Mínimo 1 unidad").max(99, "Máximo 99 unidades"),
});

export const updateOrderItemsInputSchema = z.object({
  expectedVersion: z.number().int().positive(),
  items: z.array(orderItemInputSchema).min(1).max(100),
});
export type UpdateOrderItemsInput = z.infer<typeof updateOrderItemsInputSchema>;

export const createOrderInputSchema = z.object({
  customerName: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(80),
  customerEmail: z.string().trim().email("Correo electrónico inválido").max(254),
  items: z.array(orderItemInputSchema).min(1, "Agrega al menos un producto").max(10),
});
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type CreateOrderFormValues = z.input<typeof createOrderInputSchema>;

export const apiErrorSchema = z.object({
  error: z.union([
    z.string(),
    z.object({ code: z.string().optional(), message: z.string().optional() }),
  ]).optional(),
  message: z.string().optional(),
}).passthrough();
