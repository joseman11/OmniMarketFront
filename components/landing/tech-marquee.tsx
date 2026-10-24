"use client";

import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";

const TECH = [
  { name: "Next.js", mono: "N", color: "#ffffff" },
  { name: "TypeScript", mono: "TS", color: "#5c8dff" },
  { name: "Tailwind CSS", mono: "TW", color: "#38bdf8" },
  { name: "Prisma", mono: "Pr", color: "#a493ff" },
  { name: "PostgreSQL", mono: "PG", color: "#6aa3ff" },
  { name: "Railway", mono: "Rw", color: "#c084fc" },
  { name: "GitHub Actions", mono: "GA", color: "#3ddc97" },
  { name: "Express API", mono: "Ex", color: "#ff9a5c" },
];

export function TechMarquee() {
  return (
    <section aria-label="Tecnologías" className="relative border-y border-white/[0.06] bg-ink-2 py-6">
      <p className="mb-2 text-center font-mono text-[11px] tracking-[0.2em] text-white/35 uppercase">
        Construido sobre un stack moderno y auditable
      </p>
      <InfiniteMovingCards
        items={TECH}
        speed="slow"
        className="mx-auto max-w-6xl"
        renderItem={(t) => (
          <div className="flex items-center gap-3 rounded-full border border-white/[0.07] bg-white/[0.02] py-2 pr-5 pl-2">
            <span
              className="grid size-8 place-items-center rounded-full border border-white/10 font-mono text-[11px] font-semibold"
              style={{ color: t.color, background: `${t.color}14`, boxShadow: `inset 0 0 12px ${t.color}22` }}
            >
              {t.mono}
            </span>
            <span className="text-sm font-medium whitespace-nowrap text-white/75">{t.name}</span>
          </div>
        )}
      />
    </section>
  );
}
