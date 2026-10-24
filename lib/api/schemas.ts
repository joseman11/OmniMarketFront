import { z } from "zod";
import { parseDecimal } from "@/lib/decimal";

/* ───────────────────────── Primitivas ───────────────────────── */

export const ORDER_STATUSES = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export const orderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

/** Decimal de Prisma (string) o number → number. Rechaza valores no numéricos. */
export const decimalSchema = z
  .union([z.string(), z.number()])
  .refine((v) => !Number.isNaN(parseDecimal(v, Number.NaN)), {
    message: "Decimal inválido",
  })
  .transform((v) => parseDecimal(v));

/** Días ISO "YYYY-MM-DD" o timestamps ISO completos → "YYYY-MM-DD". */
const isoDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, "Fecha inválida")
  .transform((v) => v.slice(0, 10));

/* ───────────────────────── Paginación ───────────────────────── */

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const MAX_LIMIT = 500;

export const paginationSchema = z.object({
  page: z.coerce.number().int("La página debe ser entera").min(1, "La página mínima es 1"),
  limit: z.coerce
    .number()
    .int("El límite debe ser entero")
    .min(1, "El límite mínimo es 1")
    .max(MAX_LIMIT, `El límite máximo es ${MAX_LIMIT}`),
});
export type Pagination = z.infer<typeof paginationSchema>;

export const paginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

/* ───────────────────────── Analítica ───────────────────────── */

export const analyticsRowSchema = z.object({
  day: isoDaySchema,
  categoryId: z.union([z.string(), z.number()]).transform(String),
  categoryName: z.string(),
  ordersCount: z.coerce.number().int().nonnegative(),
  revenue: decimalSchema,
  avgTicket: decimalSchema,
  grossMargin: decimalSchema,
});
export type AnalyticsRow = z.infer<typeof analyticsRowSchema>;

export const analyticsResponseSchema = z.object({
  data: z.array(analyticsRowSchema),
  meta: paginationMetaSchema,
});
export type AnalyticsResponse = z.infer<typeof analyticsResponseSchema>;

export const analyticsFiltersSchema = z
  .object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    categoryId: z.string().min(1).optional(),
  })
  .refine((f) => !f.from || !f.to || f.from <= f.to, {
    message: "La fecha inicial debe ser anterior a la final",
    path: ["to"],
  });
export type AnalyticsFilters = z.infer<typeof analyticsFiltersSchema>;

/* ───────────────────────── Kanban ───────────────────────── */

export const kanbanCardSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  orderNumber: z.string(),
  customerName: z.string(),
  total: decimalSchema,
  margin: decimalSchema,
  position: z.number().int().nonnegative(),
  version: z.number().int().nonnegative(),
  status: orderStatusSchema,
  /** No está en el contrato base; se muestra el tiempo relativo si llega. */
  updatedAt: z.string().optional(),
});
export type KanbanCard = z.infer<typeof kanbanCardSchema>;

export const kanbanColumnSchema = z.object({
  status: orderStatusSchema,
  count: z.number().int().nonnegative(),
  cards: z.array(kanbanCardSchema),
});
export type KanbanColumn = z.infer<typeof kanbanColumnSchema>;

export const kanbanStatusResponseSchema = z.object({
  columns: z.array(kanbanColumnSchema),
});
export type KanbanBoard = z.infer<typeof kanbanStatusResponseSchema>;

export const resetDataResponseSchema = z.object({
  ok: z.literal(true),
  message: z.string(),
});

/* ───────────────────────── Mutaciones ───────────────────────── */

export const moveOrderInputSchema = z.object({
  toStatus: orderStatusSchema,
  toPosition: z.number().int().nonnegative(),
  version: z.number().int().nonnegative(),
});
export type MoveOrderInput = z.infer<typeof moveOrderInputSchema>;

export const bulkUpdateInputSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Selecciona al menos una orden").max(500),
  patch: z.object({ status: orderStatusSchema }),
});
export type BulkUpdateInput = z.infer<typeof bulkUpdateInputSchema>;

export const bulkUpdateResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
});

export const orderItemInputSchema = z.object({
  productId: z.string().min(1, "Selecciona un producto"),
  quantity: z.coerce
    .number({ invalid_type_error: "La cantidad debe ser un número" })
    .int("La cantidad debe ser entera")
    .min(1, "Mínimo 1 unidad")
    .max(99, "Máximo 99 unidades"),
});

export const createOrderInputSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(80, "Máximo 80 caracteres"),
  customerEmail: z
    .string()
    .trim()
    .email("Correo electrónico inválido")
    .optional()
    .or(z.literal("")),
  items: z.array(orderItemInputSchema).min(1, "Agrega al menos un producto").max(10),
  status: orderStatusSchema,
});
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type CreateOrderFormValues = z.input<typeof createOrderInputSchema>;

/** Error estándar del backend: { error: string } | { message: string }. */
export const apiErrorSchema = z
  .object({ error: z.string().optional(), message: z.string().optional() })
  .passthrough();
