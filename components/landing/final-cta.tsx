"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { AnimatedTooltip } from "@/components/ui/animated-tooltip";
import { LampContainer } from "@/components/ui/lamp";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import { Logo } from "@/components/brand/logo";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { avatarDataUri } from "@/lib/avatar";

const SparklesCore = dynamic(() => import("@/components/ui/sparkles").then((m) => m.SparklesCore), {
  ssr: false,
});

const TEAM = [
  { id: 1, name: "Frontend", designation: "Next.js · UI", image: avatarDataUri("Front End", "#7c5cff", "#a493ff") },
  { id: 2, name: "Backend", designation: "Prisma · API", image: avatarDataUri("Back End", "#ff9a5c", "#ff6fa8") },
  { id: 3, name: "QA", designation: "Vitest · Playwright", image: avatarDataUri("Q A", "#3ddc97", "#5cc8ff") },
  { id: 4, name: "DevOps", designation: "Actions · Railway", image: avatarDataUri("Dev Ops", "#5cc8ff", "#7c5cff") },
];

export function FinalCta() {
  const reduced = usePrefersReducedMotion();
  return (
    <section aria-labelledby="cta-title" className="relative overflow-hidden bg-ink-2">
      <LampContainer className="min-h-[560px] rounded-none md:min-h-[640px]">
        <motion.h2
          id="cta-title"
          initial={{ opacity: 0.4, y: 80 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeInOut" }}
          className="mt-8 bg-gradient-to-br from-white to-white/50 bg-clip-text py-4 text-center text-4xl font-semibold tracking-tight text-transparent md:text-7xl"
        >
          Tu operación, <span className="font-serif font-normal italic">bajo control</span>
        </motion.h2>
        <div className="relative h-20 w-[min(36rem,90vw)]">
          {!reduced && (
            <SparklesCore
              background="transparent"
              minSize={0.4}
              maxSize={1.2}
              particleDensity={900}
              className="h-full w-full [mask-image:radial-gradient(260px_80px_at_top,white_20%,transparent)]"
              particleColor="#c9bcff"
            />
          )}
        </div>
        <MovingBorderButton
          as={Link}
          href="/login"
          borderRadius="9999px"
          duration={3000}
          containerClassName="h-14 w-60"
          borderClassName="bg-[radial-gradient(#7c5cff_40%,transparent_60%)]"
          className="gap-2 border-white/10 bg-[#0d0d13]/90 text-base font-medium text-white"
        >
          Comenzar ahora <ArrowRight className="size-4" />
        </MovingBorderButton>
        <div className="mt-10 flex items-center gap-4">
          <div className="flex">
            <AnimatedTooltip items={TEAM} />
          </div>
          <span className="ml-4 text-sm text-white/45">Hecho por un equipo full-stack</span>
        </div>
      </LampContainer>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-ink px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
        <Logo />
        <nav aria-label="Pie de página" className="flex flex-wrap justify-center gap-6 text-sm text-white/50">
          <a href="#producto" className="hover:text-white">Producto</a>
          <a href="#analitica" className="hover:text-white">Analítica</a>
          <a href="#kanban" className="hover:text-white">Kanban</a>
          <Link href="/login" className="hover:text-white">Iniciar sesión</Link>
        </nav>
        <p className="font-mono text-xs text-white/35">© {new Date().getFullYear()} OmniMarket · MXN · es-MX</p>
      </div>
    </footer>
  );
}
