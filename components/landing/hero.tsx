"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { HeroBackground, type CameraStatus } from "@/components/landing/hero-background";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [camStatus, setCamStatus] = useState<CameraStatus>("checking");

  return (
    <section
      ref={sectionRef}
      id="producto"
      aria-labelledby="hero-title"
      className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-black"
    >
      <HeroBackground sectionRef={sectionRef} onStatusChange={setCamStatus} />

      {/* Overlay para legibilidad (igual al demo) */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink-2" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
        <div className="max-w-4xl text-center">
          <motion.a
            href="#preview"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/70 backdrop-blur-sm transition-colors hover:border-white/20 hover:text-white"
          >
            Conoce OmniMarket &rarr;
          </motion.a>

          <motion.h1
            id="hero-title"
            initial={{ y: 18 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease }}
            className="mb-6 text-5xl leading-[0.95] font-bold tracking-tight text-balance text-white sm:text-6xl md:text-8xl"
          >
            Vende más. Entrega a tiempo.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.2 }}
            className="mx-auto mb-10 max-w-2xl text-base text-white/60 sm:text-xl"
          >
            Ve cuánto vendes, qué pedidos faltan por salir y dónde está tu ganancia, todo en un solo
            lugar. Menos hojas de cálculo, menos pedidos olvidados y clientes más contentos.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.3 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              href="/login"
              className="group relative inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-8 text-base font-medium text-black transition-all hover:scale-105 hover:bg-white/90"
            >
              Empieza gratis
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-6 inline-flex items-center gap-2 text-xs text-white/40"
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                camStatus === "live" ? "bg-success shadow-[0_0_8px_#3ddc97]" : "bg-white/30",
              )}
            />
            Tu cámara solo anima el fondo: no se graba ni se envía nada.
            <span className="sr-only" aria-live="polite">
              {camStatus === "live" ? "Cámara activa" : "Fondo ambiental sin cámara"}
            </span>
          </motion.p>
        </div>
      </div>
    </section>
  );
}
