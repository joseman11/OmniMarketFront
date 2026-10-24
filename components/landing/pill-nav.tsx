"use client";

import Link from "next/link";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#producto", label: "Producto" },
  { href: "#analitica", label: "Analítica" },
  { href: "#kanban", label: "Kanban" },
  { href: "#auditoria", label: "Auditoría" },
];

export function PillNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"
    >
      <nav
        aria-label="Principal"
        className={cn(
          "flex w-full max-w-4xl items-center justify-between gap-4 rounded-full border px-3 py-2 pl-5 transition-all duration-500",
          scrolled
            ? "border-white/10 bg-black/55 shadow-[0_8px_40px_-12px_rgb(0_0_0/0.8)] backdrop-blur-xl"
            : "border-white/[0.07] bg-white/[0.03] backdrop-blur-md",
        )}
      >
        <Link href="/" aria-label="OmniMarket, inicio" className="rounded-full">
          <Logo />
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-full px-3.5 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <Link
          href="/login"
          className="inline-flex h-9 items-center rounded-full bg-white px-4 text-sm font-medium text-black transition hover:bg-white/90"
        >
          Iniciar sesión
        </Link>
      </nav>
    </motion.header>
  );
}
