"use client";

import { motion } from "motion/react";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[11px] tracking-[0.18em] text-white/60 uppercase",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-brand shadow-[0_0_10px_#7c5cff]" />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  accent,
  description,
  align = "center",
  className,
  id,
}: {
  eyebrow?: string;
  title: string;
  accent?: string[];
  description?: string;
  align?: "center" | "left";
  className?: string;
  id?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 id={id} className="max-w-3xl text-4xl leading-[1.02] tracking-tight text-white md:text-6xl">
        <TextGenerateEffect words={title} accent={accent} className="font-semibold" />
      </h2>
      {description && (
        <Reveal delay={0.25}>
          <p className="max-w-2xl text-base text-white/55 md:text-lg">{description}</p>
        </Reveal>
      )}
    </div>
  );
}

export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Cuadrícula fina con puntos que pulsan en las intersecciones (ref. Primora).
 * Puramente decorativa; CSS-only para no costar frames.
 */
export function GridPulse({
  className,
  cell = 72,
  dots = 18,
}: {
  className?: string;
  cell?: number;
  dots?: number;
}) {
  // Posiciones deterministas (sin Math.random para evitar desajustes de hidratación)
  const points = Array.from({ length: dots }, (_, i) => ({
    x: ((i * 37) % 17) + 1,
    y: ((i * 23) % 9) + 1,
    color: i % 3 === 0 ? "#ff9a5c" : "#7c5cff",
    delay: (i * 0.37) % 3.2,
  }));
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="bg-grid absolute inset-0" style={{ ["--grid-size" as string]: `${cell}px` }} />
      {points.map((p, i) => (
        <span
          key={i}
          className="animate-pulse-dot absolute size-[3px] rounded-full"
          style={{
            left: p.x * cell - 1.5,
            top: p.y * cell - 1.5,
            background: p.color,
            boxShadow: `0 0 10px ${p.color}`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Líneas luminosas horizontales (ref. Primora). */
export function LightLines({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none relative h-16 w-full", className)}>
      {[
        { top: "20%", left: "14%", width: "18%", color: "#7c5cff" },
        { top: "50%", left: "4%", width: "62%", color: "#7c5cff" },
        { top: "80%", left: "14%", width: "18%", color: "#ff9a5c" },
        { top: "20%", left: "90%", width: "10%", color: "#ff9a5c" },
        { top: "80%", left: "92%", width: "8%", color: "#7c5cff" },
      ].map((l, i) => (
        <span
          key={i}
          className="absolute h-px"
          style={{
            top: l.top,
            left: l.left,
            width: l.width,
            background: `linear-gradient(90deg, transparent, ${l.color}, transparent)`,
            boxShadow: `0 0 12px ${l.color}`,
          }}
        />
      ))}
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/[0.06]" />
    </div>
  );
}
