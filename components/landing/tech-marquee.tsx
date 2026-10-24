"use client";

import { BellRing, Clock, PackageCheck, PiggyBank, ShoppingBag, Smile, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";

const BENEFITS: { name: string; icon: LucideIcon; color: string }[] = [
  { name: "Ventas del día al instante", icon: TrendingUp, color: "#3ddc97" },
  { name: "Cero pedidos olvidados", icon: PackageCheck, color: "#7c5cff" },
  { name: "Conoce tu ganancia real", icon: PiggyBank, color: "#f5d76e" },
  { name: "Entregas a tiempo", icon: Clock, color: "#5cc8ff" },
  { name: "Clientes más contentos", icon: Smile, color: "#ff6fa8" },
  { name: "Todo tu equipo coordinado", icon: Users, color: "#a493ff" },
  { name: "Tu catálogo siempre al día", icon: ShoppingBag, color: "#ff9a5c" },
  { name: "Avisos cuando algo se atora", icon: BellRing, color: "#6aa3ff" },
];

export function TechMarquee() {
  return (
    <section aria-label="Beneficios" className="relative border-y border-white/[0.06] bg-ink-2 py-6">
      <p className="mb-2 text-center font-mono text-[11px] tracking-[0.2em] text-white/35 uppercase">
        Lo que gana tu negocio
      </p>
      <InfiniteMovingCards
        items={BENEFITS}
        speed="slow"
        className="mx-auto max-w-6xl"
        renderItem={(t) => (
          <div className="flex items-center gap-3 rounded-full border border-white/[0.07] bg-white/[0.02] py-2 pr-5 pl-2">
            <span
              className="grid size-8 place-items-center rounded-full border border-white/10"
              style={{ color: t.color, background: `${t.color}14`, boxShadow: `inset 0 0 12px ${t.color}22` }}
            >
              <t.icon className="size-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium whitespace-nowrap text-white/75">{t.name}</span>
          </div>
        )}
      />
    </section>
  );
}
