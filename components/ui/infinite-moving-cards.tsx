"use client";

import { cn } from "@/lib/utils";
import React from "react";

type Testimonial = { quote: string; name: string; title: string };

export const InfiniteMovingCards = <T extends { name: string } = Testimonial>({
  items,
  direction = "left",
  speed = "fast",
  pauseOnHover = true,
  paused = false,
  className,
  itemClassName,
  renderItem,
}: {
  items: T[];
  direction?: "left" | "right";
  speed?: "fast" | "normal" | "slow";
  pauseOnHover?: boolean;
  /** Pausa controlada (p. ej. botón persistente de pausa, WCAG 2.2.2). */
  paused?: boolean;
  className?: string;
  itemClassName?: string;
  /** Render personalizado (p. ej. logos). Si se omite se usa la tarjeta de testimonio. */
  renderItem?: (item: T, idx: number) => React.ReactNode;
}) => {
  // Copias declarativas: React es dueño de ambas listas, así que StrictMode y los cambios de
  // items/dirección/velocidad no duplican nodos (antes cloneNode sin cleanup → 2N, 4N…).
  const style = {
    "--animation-direction": direction === "left" ? "forwards" : "reverse",
    "--animation-duration": speed === "fast" ? "20s" : speed === "normal" ? "40s" : "80s",
  } as React.CSSProperties;

  const renderList = (copy: boolean) =>
    renderItem
      ? items.map((item, idx) => (
          <li
            key={`${copy ? "copy" : "item"}-${item.name}`}
            className={cn("shrink-0", itemClassName)}
            aria-hidden={copy || undefined}
            inert={copy || undefined}
          >
            {renderItem(item, idx)}
          </li>
        ))
      : (items as unknown as Testimonial[]).map((item) => (
          <li
            className="relative w-[350px] max-w-full shrink-0 rounded-2xl border border-b-0 border-zinc-200 bg-[linear-gradient(180deg,#fafafa,#f5f5f5)] px-8 py-6 md:w-[450px] dark:border-zinc-700 dark:bg-[linear-gradient(180deg,#27272a,#18181b)]"
            key={`${copy ? "copy" : "item"}-${item.name}`}
            aria-hidden={copy || undefined}
            inert={copy || undefined}
          >
            <blockquote>
              <div
                aria-hidden="true"
                className="user-select-none pointer-events-none absolute -top-0.5 -left-0.5 -z-1 h-[calc(100%_+_4px)] w-[calc(100%_+_4px)]"
              ></div>
              <span className="relative z-20 text-sm leading-[1.6] font-normal text-neutral-800 dark:text-gray-100">
                {item.quote}
              </span>
              <div className="relative z-20 mt-6 flex flex-row items-center">
                <span className="flex flex-col gap-1">
                  <span className="text-sm leading-[1.6] font-normal text-neutral-500 dark:text-gray-400">
                    {item.name}
                  </span>
                  <span className="text-sm leading-[1.6] font-normal text-neutral-500 dark:text-gray-400">
                    {item.title}
                  </span>
                </span>
              </div>
            </blockquote>
          </li>
        ));

  return (
    <div
      style={style}
      className={cn(
        "scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
        className,
      )}
    >
      <ul
        className={cn(
          "flex w-max min-w-full shrink-0 flex-nowrap gap-4 py-4 animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]",
          paused && "[animation-play-state:paused]",
        )}
      >
        {renderList(false)}
        {renderList(true)}
      </ul>
    </div>
  );
};
