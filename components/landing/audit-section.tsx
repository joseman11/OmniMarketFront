"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HoverEffect } from "@/components/ui/card-hover-effect";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import { TracingBeam } from "@/components/ui/tracing-beam";
import { Reveal, SectionHeading } from "@/components/landing/primitives";

const ENDPOINTS = [
  {
    title: "GET /api/test/analytics",
    description: "Métricas de ventas por día y categoría con paginación en servidor: ?page=1&limit=50. Debe responder en < 300 ms.",
    link: "/dashboard/audit#analytics",
  },
  {
    title: "GET /api/test/kanban-status",
    description: "Estado actual de cada columna del tablero para verificar un movimiento Drag & Drop tras recargar.",
    link: "/dashboard/audit#kanban-status",
  },
  {
    title: "POST /api/test/reset-data",
    description: "Restablece la base de datos a un conjunto conocido para E2E repetibles. Acción destructiva con confirmación.",
    link: "/dashboard/audit#reset-data",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Restablece los datos",
    body: "Ejecuta POST /api/test/reset-data desde el panel para partir de un estado conocido.",
  },
  {
    n: "02",
    title: "Mide la analítica",
    body: "Prueba GET /api/test/analytics con distintos page/limit y verifica código HTTP y latencia.",
  },
  {
    n: "03",
    title: "Verifica el Kanban",
    body: "Mueve una orden en el tablero y confirma su nuevo estado con GET /api/test/kanban-status.",
  },
];

export function AuditSection() {
  return (
    <section id="auditoria" aria-labelledby="audit-title" className="relative scroll-mt-24 bg-ink-2 px-4 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          id="audit-title"
          eyebrow="Auditoría de API"
          title="Tres endpoints, cero fricción para evaluar"
          accent={["cero", "fricción"]}
          description="Un panel dedicado para que cualquier evaluador pruebe el backend con un clic: código HTTP, latencia y JSON resaltado."
        />
        <HoverEffect items={ENDPOINTS} className="mt-10" />

        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <TracingBeam className="px-6">
            <ol className="space-y-12 pl-4 md:pl-0">
              {STEPS.map((s) => (
                <li key={s.n}>
                  <span className="font-mono text-xs text-brand-soft">{s.n}</span>
                  <h3 className="mt-1 text-xl font-semibold text-white">{s.title}</h3>
                  <p className="mt-2 max-w-md text-sm text-white/55">{s.body}</p>
                </li>
              ))}
            </ol>
          </TracingBeam>
          <Reveal className="flex flex-col items-center gap-6 rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-10 text-center">
            <p className="max-w-sm text-white/65">
              El panel de auditoría vive dentro del dashboard protegido. Inicia sesión con Google o GitHub para usarlo.
            </p>
            <MovingBorderButton
              as={Link}
              href="/dashboard/audit"
              borderRadius="9999px"
              duration={3200}
              containerClassName="h-12 w-64"
              borderClassName="bg-[radial-gradient(#ff9a5c_40%,transparent_60%)]"
              className="gap-2 border-white/10 bg-[#0d0d13]/90 text-sm font-medium text-white"
            >
              Ir al panel de auditoría <ArrowRight className="size-4" />
            </MovingBorderButton>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
