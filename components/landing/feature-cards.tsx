"use client";

import { motion } from "motion/react";
import { Check, CircleDot, PackageCheck, Timer, Truck } from "lucide-react";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import { Reveal } from "@/components/landing/primitives";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

const LINE = "M0 70 C 30 66, 45 40, 70 46 S 110 74, 135 50 S 175 12, 200 22 S 240 30, 260 8";

function StackCard({
  title,
  value,
  children,
  className,
}: {
  title: string;
  value: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-gradient-to-b from-[#24242c] to-[#15151b] p-5 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.08)] ${className ?? ""}`}
    >
      <div className="text-sm text-white/70">{title}</div>
      <div className="mt-3 rounded-lg border border-white/[0.06] bg-black/30 p-3">
        <div className="font-mono text-2xl text-white">{value}</div>
        {children}
      </div>
    </div>
  );
}

function AnalyticsVisual() {
  // Las tres tarjetas comparten la misma celda de grid; la inclinación es estática
  // (wrapper) y CardItem añade profundidad (translateZ) al pasar el mouse.
  const layers = [
    { z: 20, tilt: "rotate(-18deg) translate(-150px, 52px)", node: <StackCard title="Órdenes / día" value="284" className="opacity-70" /> },
    { z: 50, tilt: "rotate(-9deg) translate(-78px, 22px)", node: <StackCard title="Margen bruto" value="46.2%" className="opacity-85" /> },
  ];
  return (
    <CardContainer containerClassName="py-0 w-full" className="w-full">
      <CardBody className="grid h-auto w-full place-items-center py-6 [&>*]:col-start-1 [&>*]:row-start-1">
        {layers.map((l) => (
          <div key={l.z} className="w-[280px]" style={{ transform: l.tilt }}>
            <CardItem translateZ={l.z} className="w-full">
              {l.node}
            </CardItem>
          </div>
        ))}
        <div className="w-[300px]" style={{ transform: "translate(70px, -10px)" }}>
          <CardItem translateZ={90} className="w-full">
            <StackCard title="Ingresos hoy" value="$58,214.90">
              <svg viewBox="0 0 260 80" className="mt-2 h-16 w-full overflow-visible" aria-hidden="true">
                <defs>
                  <linearGradient id="fc-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#7c5cff" stopOpacity="0.45" />
                    <stop offset="1" stopColor="#7c5cff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <motion.path
                  d={`${LINE} L260 80 L0 80Z`}
                  fill="url(#fc-area)"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.8 }}
                />
                <motion.path
                  d={LINE}
                  fill="none"
                  stroke="#e9e4ff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.6, ease: "easeInOut" }}
                />
              </svg>
              <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-xs">
                <div className="flex justify-between text-white/70">
                  <span>OM-1093 · Electrónica</span>
                  <span className="font-mono text-success">+$4,290</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>OM-1092 · Moda</span>
                  <span className="font-mono text-white/80">+$1,799</span>
                </div>
              </div>
            </StackCard>
          </CardItem>
        </div>
      </CardBody>
    </CardContainer>
  );
}

const STAGES = [
  { status: "PENDING", label: "Pendiente", icon: CircleDot, color: "#9a9aab" },
  { status: "PROCESSING", label: "Procesando", icon: Timer, color: "#7c5cff" },
  { status: "SHIPPED", label: "Enviado", icon: Truck, color: "#ff9a5c" },
  { status: "DELIVERED", label: "Entregado", icon: PackageCheck, color: "#3ddc97" },
];

function CircuitVisual() {
  const reduced = usePrefersReducedMotion();
  // 4 chips sobre un viewBox de 640×220; las pistas se dibujan entre ellos.
  const xs = [66, 242, 418, 594];
  return (
    <div className="relative w-full">
      <svg viewBox="0 0 660 220" className="h-auto w-full" aria-hidden="true">
        <defs>
          <linearGradient id="trace" x1="0" x2="1">
            <stop offset="0" stopColor="#7c5cff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#c9bcff" />
            <stop offset="1" stopColor="#ff9a5c" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Pistas decorativas tipo circuito */}
        {xs.flatMap((x, c) =>
          Array.from({ length: 5 }).map((_, i) => {
            const px = x - 16 + i * 8;
            const bend = (i - 2) * 10;
            return (
              <path
                key={`v${c}-${i}`}
                d={`M${px + bend} 0 V40 L${px} 62 V74 M${px} 146 V158 L${px - bend} 180 V220`}
                stroke="rgb(255 255 255 / 0.07)"
                strokeWidth="1.2"
                fill="none"
              />
            );
          }),
        )}
        {[0, 1, 2].map((i) => {
          const x1 = xs[i]! + 40;
          const x2 = xs[i + 1]! - 40;
          const mid = (x1 + x2) / 2;
          const d = `M${x1} 110 H${mid - 10} L${mid} ${i % 2 ? 98 : 122} L${mid + 10} 110 H${x2}`;
          return (
            <g key={i}>
              <path d={d} stroke="rgb(255 255 255 / 0.14)" strokeWidth="1.5" fill="none" />
              <path d={`M${x1} 96 H${x2}`} stroke="rgb(255 255 255 / 0.05)" strokeWidth="1" fill="none" />
              <path d={`M${x1} 124 H${x2}`} stroke="rgb(255 255 255 / 0.05)" strokeWidth="1" fill="none" />
              {!reduced && (
                <motion.path
                  d={d}
                  stroke="url(#trace)"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0.25, pathOffset: 0 }}
                  animate={{ pathOffset: [0, 1.25] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.55 }}
                />
              )}
              <circle cx={x1} cy={110} r="4" fill="#0b0b10" stroke="rgb(255 255 255 / 0.3)" />
              <circle cx={x2} cy={110} r="4" fill="#0b0b10" stroke="rgb(255 255 255 / 0.3)" />
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0">
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.status}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.12, duration: 0.6 }}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(xs[i]! / 660) * 100}%` }}
            >
              <div
                className="grid size-[clamp(52px,7vw,74px)] place-items-center rounded-2xl border bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur"
                style={{ borderColor: `${s.color}55`, boxShadow: `0 0 30px -8px ${s.color}88, inset 0 1px 0 rgb(255 255 255 / 0.08)` }}
              >
                <div className="grid size-[70%] place-items-center rounded-xl border border-white/10 bg-black/40">
                  <Icon className="size-[40%]" style={{ color: s.color }} />
                </div>
              </div>
              <div className="mt-2 text-center font-mono text-[10px] tracking-wider text-white/60">{s.status}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function FeatureShell({
  id,
  title,
  accent,
  description,
  bullets,
  visual,
  reverse,
}: {
  id: string;
  title: string;
  accent: string[];
  description: string;
  bullets: string[];
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <Reveal>
      <article
        id={id}
        className="group relative scroll-mt-28 overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-[#121219] via-[#0c0c11] to-[#0a0a0e] p-8 md:p-14"
      >
        <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-30 [--grid-size:44px] mask-fade-b" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 right-0 h-[420px] w-[520px] rounded-full bg-ember/10 blur-[120px] transition-opacity duration-700 group-hover:opacity-80"
        />
        <div className={`relative grid items-center gap-10 lg:grid-cols-2 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
          <div>
            <h3 className="text-3xl leading-[1.05] tracking-tight text-white md:text-5xl">
              <TextGenerateEffect words={title} accent={accent} className="font-semibold" />
            </h3>
            <p className="mt-5 max-w-md text-base text-white/60 md:text-lg">{description}</p>
            <ul className="mt-6 space-y-3">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-white/70">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-brand/40 bg-brand/10">
                    <Check className="size-3 text-brand-soft" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex min-h-[300px] items-center justify-center">{visual}</div>
        </div>
      </article>
    </Reveal>
  );
}

export function FeatureCards() {
  return (
    <section aria-label="Funciones principales" className="relative bg-ink-2 px-4 py-16 md:py-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <FeatureShell
          id="analitica"
          title="Analítica en tiempo cercano al real"
          accent={["cercano", "al", "real"]}
          description="Ingresos por día, margen por categoría y ticket promedio con paginación en servidor y latencia medida en cada consulta."
          bullets={[
            "Paginación ?page=&limit= resuelta en el backend",
            "Badge de latencia: verde por debajo de 300 ms",
            "Decimals de Prisma parseados de forma segura",
          ]}
          visual={<AnalyticsVisual />}
        />
        <FeatureShell
          id="kanban"
          reverse
          title="Kanban con mutación optimista"
          accent={["optimista"]}
          description="Arrastra órdenes entre estados: la UI responde al instante y, si el servidor falla, revierte con una sacudida y te avisa."
          bullets={[
            "Concurrencia optimista con version (409 → recarga)",
            "Bulk update atómico con confirmación",
            "Navegación por teclado con dnd-kit",
          ]}
          visual={<CircuitVisual />}
        />
      </div>
    </section>
  );
}
