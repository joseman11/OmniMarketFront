"use client";

import { useEffect, useState, type RefObject } from "react";

/** IntersectionObserver simple; se usa para pausar canvas y cámara fuera de pantalla. */
export function useInViewport<T extends Element>(
  ref: RefObject<T | null>,
  { threshold = 0, rootMargin = "0px" }: { threshold?: number; rootMargin?: string } = {},
): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), {
      threshold,
      rootMargin,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold, rootMargin]);
  return inView;
}
