import { BarChart3, KanbanSquare, LayoutDashboard, Package, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; testId: string; description: string };

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard, testId: "nav-resumen", description: "KPIs y últimas órdenes" },
  { href: "/dashboard/analytics", label: "Analítica", icon: BarChart3, testId: "nav-analytics", description: "Ingresos, márgenes y tabla paginada" },
  { href: "/dashboard/kanban", label: "Kanban", icon: KanbanSquare, testId: "nav-kanban", description: "Flujo de órdenes con Drag & Drop" },
  { href: "/dashboard/catalog", label: "Catálogo", icon: Package, testId: "nav-catalog", description: "Productos y categorías" },
];

/** `?nuevo=producto` abre el alta de producto del catálogo (enlace del estado vacío de «Nueva orden»). */
export const NEW_PRODUCT_PARAM = { name: "nuevo", value: "producto" } as const;
export const NEW_PRODUCT_HREF = `/dashboard/catalog?${NEW_PRODUCT_PARAM.name}=${NEW_PRODUCT_PARAM.value}`;

export function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
}

export function titleFor(pathname: string) {
  if (pathname.startsWith("/dashboard/orders/")) return "Detalle de orden";
  return [...NAV_ITEMS].reverse().find((n) => isActive(pathname, n.href))?.label ?? "Resumen";
}
