"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { SectionHeading } from "@/components/landing/primitives";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { formatCurrency } from "@/lib/format";

type FloatOrder = {
  id: string;
  customer: string;
  items: string;
  total: number;
  status: string;
  tone: string;
  from: string;
  to: string;
};

const ROW_A: FloatOrder[] = [
  { id: "OM-1093", customer: "Valeria H.", items: "Cafetera espresso", total: 4290, status: "PROCESSING", tone: "#7c5cff", from: "#2b1d6b", to: "#7c5cff" },
  { id: "OM-1094", customer: "Diego R.", items: "Tenis urbanos ×2", total: 3598, status: "SHIPPED", tone: "#ff9a5c", from: "#5a2410", to: "#ff9a5c" },
  { id: "OM-1095", customer: "Sofía M.", items: "Kit skincare", total: 1120, status: "DELIVERED", tone: "#3ddc97", from: "#0e3b2a", to: "#3ddc97" },
  { id: "OM-1096", customer: "Emiliano G.", items: "Smartwatch Fit Pro", total: 3299, status: "PENDING", tone: "#5cc8ff", from: "#0e2a45", to: "#5cc8ff" },
  { id: "OM-1097", customer: "Regina L.", items: "Mancuernas 20 kg", total: 2890, status: "PROCESSING", tone: "#ff6fa8", from: "#4a1230", to: "#ff6fa8" },
  { id: "OM-1098", customer: "Santiago T.", items: "Audífonos ANC", total: 2499, status: "SHIPPED", tone: "#a493ff", from: "#24185a", to: "#a493ff" },
];

const ROW_B: FloatOrder[] = [
  { id: "OM-1099", customer: "Ximena F.", items: "Sartenes cerámicos", total: 1590, status: "DELIVERED", tone: "#ff9a5c", from: "#53230e", to: "#ffb98a" },
  { id: "OM-1100", customer: "Mateo S.", items: "Teclado mecánico", total: 1899, status: "PENDING", tone: "#7c5cff", from: "#1d1550", to: "#7c5cff" },
  { id: "OM-1101", customer: "Camila R.", items: "Mochila 25 L ×2", total: 1798, status: "PROCESSING", tone: "#3ddc97", from: "#0b3324", to: "#3ddc97" },
  { id: "OM-1102", customer: "Leonardo C.", items: "Tapete de yoga", total: 749, status: "CANCELLED", tone: "#ff5c7a", from: "#4a0f1e", to: "#ff5c7a" },
  { id: "OM-1103", customer: "Renata M.", items: "Lámpara LED ×3", total: 2067, status: "SHIPPED", tone: "#5cc8ff", from: "#0b2840", to: "#5cc8ff" },
  { id: "OM-1104", customer: "Sebastián O.", items: "Libro de sistemas", total: 789, status: "DELIVERED", tone: "#f5d76e", from: "#3d330c", to: "#f5d76e" },
];

const TILTS = [-6, 4, -3, 7, -5, 3];

function OrderTile({ o, i }: { o: FloatOrder; i: number }) {
  return (
    <div
      className="relative w-[260px] shrink-0 md:w-[300px]"
      style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg) translateY(${(i % 3) * 14}px)` }}
    >
      {/* Degradado de color que "sangra" bajo el vidrio (ref. RareBlocks / Lightspark) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-[26px] opacity-90 blur-[2px]"
        style={{ background: `linear-gradient(160deg, ${o.from}, ${o.to}88 60%, transparent)` }}
      />
      <div className="relative m-3 rounded-2xl p-4 glass shadow-[0_20px_50px_-20px_rgb(0_0_0/0.8)]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-white/70">{o.id}</span>
          <span
            className="rounded-full px-2 py-0.5 font-mono text-[10px]"
            style={{ color: o.tone, background: `${o.tone}1f`, border: `1px solid ${o.tone}44` }}
          >
            {o.status}
          </span>
        </div>
        <div className="mt-4 text-sm text-white">{o.items}</div>
        <div className="text-xs text-white/50">{o.customer}</div>
        <div className="mt-4 flex items-end justify-between">
          <span className="font-mono text-xl text-white">{formatCurrency(o.total)}</span>
          <span className="text-[10px] text-white/40">MXN</span>
        </div>
      </div>
    </div>
  );
}

export function FloatingOrders() {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const xA = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [80, -260]);
  const xB = useTransform(scrollYProgress, [0, 1], reduced ? [-200, -200] : [-360, 40]);

  return (
    <section ref={ref} aria-labelledby="orders-title" className="relative overflow-hidden bg-ink-2 pt-24 md:pt-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-[radial-gradient(60%_60%_at_50%_100%,rgb(124_92_255/0.22),transparent)]"
      />
      <div className="relative px-4">
        <SectionHeading
          id="orders-title"
          eyebrow="Órdenes"
          title="Cada orden, siempre en movimiento"
          accent={["siempre", "en", "movimiento"]}
          description="Pendiente, procesando, enviada, entregada. Cada cambio queda versionado y auditable."
        />
      </div>
      <div className="relative mt-16 flex flex-col gap-8 pb-0">
        <motion.div style={{ x: xA }} className="flex gap-6 will-change-transform">
          {ROW_A.concat(ROW_A.slice(0, 2)).map((o, i) => (
            <OrderTile key={`a-${i}`} o={o} i={i} />
          ))}
        </motion.div>
        {/* La segunda fila sangra por el borde inferior de la sección */}
        <motion.div style={{ x: xB }} className="-mb-24 flex gap-6 will-change-transform">
          {ROW_B.concat(ROW_B.slice(0, 2)).map((o, i) => (
            <OrderTile key={`b-${i}`} o={o} i={i + 1} />
          ))}
        </motion.div>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-ink-2" />
    </section>
  );
}
