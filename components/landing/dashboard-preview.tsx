"use client";

import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { DashboardMockup } from "@/components/landing/dashboard-mockup";
import { GridPulse, SectionHeading } from "@/components/landing/primitives";

export function DashboardPreview() {
  return (
    <section id="preview" aria-labelledby="preview-title" className="relative overflow-hidden bg-ink-2">
      <GridPulse className="mask-fade-y opacity-70" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[38%] left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-brand/20 blur-[140px]"
      />
      <div className="relative">
        <ContainerScroll
          titleComponent={
            <SectionHeading
              id="preview-title"
              eyebrow="Tu negocio de un vistazo"
              title="Todo tu negocio en una sola vista"
              accent={["sola", "vista"]}
              description="Cuánto vendiste hoy, qué categorías te dejan más dinero y qué pedidos acaban de llegar. Abre la pantalla y en segundos sabes cómo va tu día."
              className="mb-16"
            />
          }
        >
          <DashboardMockup />
        </ContainerScroll>
      </div>
    </section>
  );
}
