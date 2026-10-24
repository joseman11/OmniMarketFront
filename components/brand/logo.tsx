import { cn } from "@/lib/utils";

/** Isotipo: cubo isométrico (eco de la cuadrícula de cubos del hero). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn("size-6", className)}>
      <defs>
        <linearGradient id="om-g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a493ff" />
          <stop offset="1" stopColor="#7c5cff" />
        </linearGradient>
        <linearGradient id="om-g2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb98a" />
          <stop offset="1" stopColor="#ff9a5c" />
        </linearGradient>
      </defs>
      <path d="M16 3 28 10 16 17 4 10Z" fill="url(#om-g1)" />
      <path d="M4 10v12l12 7V17Z" fill="#3a2a8f" />
      <path d="M28 10v12l-12 7V17Z" fill="url(#om-g2)" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight text-white", className)}>
      <LogoMark />
      {!compact && (
        <span className="text-[15px]">
          OmniMarket<span className="text-white/45"> Hub</span>
        </span>
      )}
    </span>
  );
}
