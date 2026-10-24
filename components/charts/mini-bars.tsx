"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Mini gráfica de barras con glow (ref. Starlight "Monthly Summary"). */
export function MiniBars({
  values,
  color = "#7c5cff",
  className,
  height = 56,
}: {
  values: number[];
  color?: string;
  className?: string;
  height?: number;
}) {
  const max = Math.max(...values, 1);
  return (
    <div aria-hidden="true" className={cn("flex items-end gap-[5px]", className)} style={{ height }}>
      {values.map((v, i) => (
        <div key={i} className="relative h-full flex-1 rounded-[2px] bg-white/[0.04]">
          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: i * 0.035, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-x-0 bottom-0 origin-bottom rounded-[2px]"
            style={{
              height: `${Math.max(6, (v / max) * 100)}%`,
              background: `linear-gradient(to top, ${color}66, ${color})`,
              boxShadow: `0 0 10px ${color}55`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
