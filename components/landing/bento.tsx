"use client";

import { motion } from "motion/react";
import { Check, Lock, ShieldCheck, X } from "lucide-react";
import { GitHubIcon, GoogleIcon } from "@/components/brand/provider-icons";
import { AnimatedNumber } from "@/components/charts/animated-number";
import { BentoGrid } from "@/components/ui/bento-grid";
import { GlowCard } from "@/components/landing/glow-card";
import { Reveal } from "@/components/landing/primitives";
import { cn } from "@/lib/utils";

function BentoItem({
  title,
  description,
  color,
  className,
  children,
}: {
  title: string;
  description: string;
  color: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <GlowCard glow={color} className={cn("row-span-1 flex flex-col", className)}>
      <div className="flex h-full flex-col p-6">
        <div className="relative min-h-[150px] flex-1">{children}</div>
        <div className="mt-4">
          <h3 className="text-lg leading-snug font-semibold" style={{ color }}>
            {title}
          </h3>
          <p className="mt-1 text-sm text-white/50">{description}</p>
        </div>
      </div>
    </GlowCard>
  );
}

function OAuthAnim() {
  return (
    <div className="flex h-full items-center justify-center gap-6">
      <div className="flex flex-col gap-4">
        {[
          { icon: <GoogleIcon className="size-5" />, name: "Google" },
          { icon: <GitHubIcon className="size-5 text-white" />, name: "GitHub" },
        ].map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ x: -10, opacity: 0 }}
            whileInView={{ x: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/80"
          >
            {p.icon} {p.name}
          </motion.div>
        ))}
      </div>
      <div className="relative h-px w-14 bg-white/10">
        <motion.span
          className="absolute -top-[3px] size-[7px] rounded-full bg-brand shadow-[0_0_12px_#7c5cff]"
          animate={{ left: ["0%", "100%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="grid size-16 place-items-center rounded-2xl border border-brand/40 bg-brand/10 shadow-[0_0_40px_-6px_#7c5cff]">
        <ShieldCheck className="size-7 text-brand-soft" />
      </div>
    </div>
  );
}

function BulkAnim() {
  const rows = ["OM-1088", "OM-1089", "OM-1090", "OM-1091"];
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      {rows.map((r, i) => (
        <motion.div
          key={r}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08 }}
          className="flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2"
        >
          <div className="flex items-center gap-3">
            <motion.span
              className="grid size-4 place-items-center rounded border"
              initial={{ backgroundColor: "rgba(0,0,0,0)", borderColor: "rgba(255,255,255,0.25)" }}
              whileInView={{ backgroundColor: "#ff9a5c", borderColor: "#ff9a5c" }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 + i * 0.25 }}
            >
              <Check className="size-3 text-black" />
            </motion.span>
            <span className="font-mono text-xs text-white/75">{r}</span>
          </div>
          <div className="relative h-5 w-24 overflow-hidden text-right font-mono text-[10px]">
            <motion.span
              className="absolute right-0 text-white/40"
              initial={{ y: 0 }}
              whileInView={{ y: -20 }}
              viewport={{ once: true }}
              transition={{ delay: 1.8 }}
            >
              PENDING
            </motion.span>
            <motion.span
              className="absolute right-0 text-ember"
              initial={{ y: 20 }}
              whileInView={{ y: 2 }}
              viewport={{ once: true }}
              transition={{ delay: 1.8 }}
            >
              SHIPPED ✓
            </motion.span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function LatencyAnim() {
  const r = 70;
  const c = Math.PI * r;
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <svg viewBox="0 0 180 100" className="w-56" aria-hidden="true">
        <path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="10" strokeLinecap="round" />
        <motion.path
          d="M20 90 A70 70 0 0 1 160 90"
          fill="none"
          stroke="url(#lat)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c * (1 - 182 / 300) }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs>
          <linearGradient id="lat" x1="0" x2="1">
            <stop offset="0" stopColor="#3ddc97" />
            <stop offset="1" stopColor="#a3f7d1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="-mt-10 font-mono text-5xl font-medium text-white">
        <AnimatedNumber value={182} />
        <span className="ml-1 text-xl text-white/40">ms</span>
      </div>
      <div className="mt-3 rounded-full border border-success/30 bg-success/10 px-3 py-1 font-mono text-[11px] text-success">
        p95 &lt; 300 ms · SLA cumplido
      </div>
      <div className="mt-6 grid w-full grid-cols-3 gap-2 text-center">
        {[
          ["analytics", 182],
          ["kanban", 96],
          ["bulk", 211],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-white/[0.06] bg-white/[0.02] py-2">
            <div className="font-mono text-[10px] text-white/40">{k}</div>
            <div className="font-mono text-sm text-white">
              <AnimatedNumber value={v as number} /> ms
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EndpointsAnim() {
  const lines = [
    { m: "GET", p: "/api/test/analytics?page=1", s: "200", t: "182ms" },
    { m: "GET", p: "/api/test/kanban-status", s: "200", t: "96ms" },
    { m: "POST", p: "/api/test/reset-data", s: "200", t: "241ms" },
  ];
  return (
    <div className="h-full rounded-xl border border-white/[0.07] bg-black/50 p-3 font-mono text-[11px]">
      <div className="mb-2 flex gap-1.5">
        <span className="size-2 rounded-full bg-white/15" />
        <span className="size-2 rounded-full bg-white/15" />
        <span className="size-2 rounded-full bg-white/15" />
      </div>
      {lines.map((l, i) => (
        <motion.div
          key={l.p}
          initial={{ opacity: 0, x: -6 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + i * 0.4 }}
          className="flex items-center gap-2 py-1"
        >
          <span className={l.m === "GET" ? "text-[#5cc8ff]" : "text-ember"}>{l.m}</span>
          <span className="truncate text-white/70">{l.p}</span>
          <span className="ml-auto text-success">{l.s}</span>
          <span className="text-white/35">{l.t}</span>
        </motion.div>
      ))}
      <motion.span
        className="mt-1 inline-block h-3 w-1.5 bg-white/60"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    </div>
  );
}

function CiAnim() {
  const steps = [
    { k: "lint", ok: true },
    { k: "typecheck", ok: true },
    { k: "test", ok: false },
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      {steps.map((s, i) => (
        <motion.div
          key={s.k}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.35 }}
          className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 font-mono text-xs"
        >
          <span
            className={cn(
              "grid size-5 place-items-center rounded-full",
              s.ok ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
            )}
          >
            {s.ok ? <Check className="size-3" /> : <X className="size-3" />}
          </span>
          <span className="text-white/70">{s.k}</span>
          <span className={cn("ml-auto", s.ok ? "text-white/30" : "text-danger")}>{s.ok ? "passed" : "1 failed"}</span>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 1.4 }}
        className="flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 font-mono text-xs text-danger"
      >
        <Lock className="size-3.5" /> deploy bloqueado
      </motion.div>
    </div>
  );
}

function SslAnim() {
  return (
    <div className="flex h-full items-center gap-6">
      <div className="relative grid size-28 shrink-0 place-items-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full border border-[#5cc8ff]/40"
            animate={{ scale: [0.6, 1.25], opacity: [0.8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
          />
        ))}
        <div className="grid size-14 place-items-center rounded-2xl border border-[#5cc8ff]/40 bg-[#5cc8ff]/10 shadow-[0_0_30px_-6px_#5cc8ff]">
          <Lock className="size-6 text-[#5cc8ff]" />
        </div>
      </div>
      <div className="min-w-0 flex-1 rounded-xl border border-white/[0.07] bg-black/40 p-4 font-mono text-xs">
        <div className="flex items-center gap-2 text-white/80">
          <span className="text-success">●</span> https://omnimarket.up.railway.app
        </div>
        <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-white/45">
          <span>Certificado</span>
          <span className="text-white/75">Let&apos;s Encrypt · válido</span>
          <span>TLS</span>
          <span className="text-white/75">1.3</span>
          <span>Región</span>
          <span className="text-white/75">us-west</span>
          <span>Estado</span>
          <span className="text-success">Desplegado</span>
        </div>
      </div>
    </div>
  );
}

export function Bento() {
  return (
    <section aria-label="Plataforma" className="relative bg-ink-2 px-4 py-20 md:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <BentoGrid className="max-w-none md:auto-rows-[20rem]">
            <BentoItem title="OAuth 2.0 con Google y GitHub" description="Sin contraseñas. Sesión JWT de Auth.js v5." color="#a493ff">
              <OAuthAnim />
            </BentoItem>
            <BentoItem className="md:col-span-2" title="Bulk Update atómico" description="Todo o nada: una transacción para N órdenes, con confirmación previa." color="#ff9a5c">
              <BulkAnim />
            </BentoItem>
            <BentoItem className="md:row-span-2" title="Respuestas < 300 ms" description="Latencia medida en cada petición y visible en la UI." color="#3ddc97">
              <LatencyAnim />
            </BentoItem>
            <BentoItem title="Endpoints de auditoría" description="/api/test/* listos para evaluadores y E2E repetibles." color="#5cc8ff">
              <EndpointsAnim />
            </BentoItem>
            <BentoItem title="CI/CD que bloquea despliegues" description="GitHub Actions detiene el deploy si un test falla." color="#ff6fa8">
              <CiAnim />
            </BentoItem>
            <BentoItem className="md:col-span-2" title="Despliegue con SSL en Railway" description="URL pública con certificado válido y disponibilidad continua." color="#5cc8ff">
              <SslAnim />
            </BentoItem>
          </BentoGrid>
        </Reveal>
      </div>
    </section>
  );
}
