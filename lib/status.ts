import type { OrderStatus } from "@/lib/api/schemas";

export const STATUS_META: Record<OrderStatus, { label: string; color: string; short: string }> = {
  PENDING: { label: "Pendiente", short: "PEND", color: "#9a9aab" },
  PROCESSING: { label: "Procesando", short: "PROC", color: "#8a6dff" },
  SHIPPED: { label: "Enviado", short: "ENV", color: "#e8834a" },
  DELIVERED: { label: "Entregado", short: "ENT", color: "#3ddc97" },
  CANCELLED: { label: "Cancelado", short: "CANC", color: "#ff5c7a" },
};
