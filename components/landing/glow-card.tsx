"use client";

import { useMotionTemplate, useMotionValue, motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Tarjeta con resplandor radial que sigue al puntero + elevación en hover. */
export function GlowCard({
  children,
  className,
  glow = "#7c5cff",
}: {
  children: React.ReactNode;
  className?: string;
  glow?: string;
}) {
  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const bg = useMotionTemplate`radial-gradient(360px circle at ${mx}px ${my}px, ${glow}26, transparent 70%)`;
  const border = useMotionTemplate`radial-gradient(240px circle at ${mx}px ${my}px, ${glow}aa, transparent 70%)`;

  return (
    <div
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      onPointerLeave={() => {
        mx.set(-400);
        my.set(-400);
      }}
      className={cn(
        "group/glow relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0d0d13] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgb(0_0_0/0.9)]",
        className,
      )}
    >
      {/* borde iluminado */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover/glow:opacity-100"
        style={{
          background: border,
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          padding: 1,
        }}
      />
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: bg }} />
      <div className="relative h-full">{children}</div>
    </div>
  );
}
