"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserMenu, type ShellUser } from "@/components/dashboard/user-menu";
import { NAV_ITEMS, isActive } from "@/components/dashboard/nav";
import { Skeleton } from "@/components/ui/skeleton";
import { useReferenceDate } from "@/components/dashboard/reference-date";
import { computeKpis, isoDaysBefore } from "@/lib/analytics";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { useAnalyticsSeries } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

function QuickStats() {
  const today = useReferenceDate();
  const from = isoDaysBefore(today, 29);
  const { data, isLoading } = useAnalyticsSeries({ from });
  const k = data ? computeKpis(data, 30, today) : null;
  const rows: [string, string | null][] = [
    ["Ingresos 30 d", k ? formatCurrency(k.revenue.value, { compact: true }) : null],
    ["Órdenes", k ? formatNumber(k.orders.value) : null],
    ["Margen bruto", k ? formatPercent(k.marginPct.value) : null],
  ];
  return (
    <div className="pb-1">
      {rows.map(([label, value]) => (
        <div key={label} className="border-t border-white/[0.04] py-2 pr-3 pl-10">
          <div className="text-[12px] text-white/55">{label}</div>
          {isLoading || !value ? (
            <Skeleton className="mt-1 h-3 w-16" />
          ) : (
            <div className="font-mono text-[11px] text-subtle">{value}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function SidebarContent({
  user,
  collapsed = false,
  onToggle,
  onNavigate,
}: {
  user: ShellUser;
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [groupOpen, setGroupOpen] = useState(true);
  const [first, ...rest] = NAV_ITEMS;

  const link = (item: (typeof NAV_ITEMS)[number]) => {
    const active = isActive(pathname, item.href);
    const Icon = item.icon;
    const el = (
      <Link
        href={item.href}
        data-testid={item.testId}
        aria-current={active ? "page" : undefined}
        // Colapsada sólo queda el icono: el enlace conserva su nombre accesible.
        aria-label={collapsed ? item.label : undefined}
        onClick={onNavigate}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors",
          active ? "text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white",
          collapsed && "justify-center px-0",
        )}
      >
        {active && (
          <motion.span
            layoutId="sidebar-active"
            className="absolute inset-0 rounded-xl border border-white/[0.08] bg-white/[0.06]"
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          />
        )}
        <Icon className={cn("relative size-[18px] shrink-0", active && "text-brand-soft")} />
        {!collapsed && <span className="relative">{item.label}</span>}
      </Link>
    );
    return collapsed ? (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>{el}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    ) : (
      <div key={item.href}>{el}</div>
    );
  };

  return (
    <div className="flex h-full flex-col p-3">
      <div className={cn("mb-6 flex items-center gap-2 px-2 pt-2", collapsed && "flex-col px-0")}>
        <Link href="/dashboard" className="flex items-center gap-2 rounded-lg" aria-label="OmniMarket, resumen">
          <LogoMark className="size-7" />
          {!collapsed && <span className="text-[15px] font-semibold tracking-tight text-white">OmniMarket</span>}
        </Link>
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
            className={cn(
              "grid size-8 place-items-center rounded-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white",
              !collapsed && "ml-auto",
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        )}
      </div>

      <nav aria-label="Secciones del dashboard" className="flex flex-1 flex-col gap-1">
        {/* Grupo expandible (ref. Starlight "Treasury") */}
        {collapsed ? (
          link(first!)
        ) : (
          <div className="mb-2 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-center">
              <div className="flex-1">{link(first!)}</div>
              <button
                type="button"
                onClick={() => setGroupOpen((v) => !v)}
                aria-expanded={groupOpen}
                aria-label={groupOpen ? "Ocultar indicadores rápidos" : "Mostrar indicadores rápidos"}
                className="mr-1 grid size-8 place-items-center rounded-lg text-white/40 hover:text-white"
              >
                <ChevronDown className={cn("size-4 transition-transform", !groupOpen && "-rotate-90")} />
              </button>
            </div>
            <AnimatePresence initial={false}>
              {groupOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <QuickStats />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {rest.map(link)}
      </nav>

      <div className="mt-4">
        <UserMenu user={user} collapsed={collapsed} />
      </div>
    </div>
  );
}
