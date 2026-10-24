"use client";
import { useEffect, useRef } from "react";
import { motion, stagger, useAnimate, useInView } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Aceternity Text Generate Effect, adaptado:
 *  - se dispara al entrar en viewport (no al montar)
 *  - `accent`: palabras que se pintan en Instrument Serif cursiva
 *  - tamaño/peso controlados desde `className`
 */
export const TextGenerateEffect = ({
  words,
  accent = [],
  className,
  wordClassName,
  filter = true,
  duration = 0.5,
}: {
  words: string;
  accent?: string[];
  className?: string;
  wordClassName?: string;
  filter?: boolean;
  duration?: number;
}) => {
  const [scope, animate] = useAnimate();
  const inViewRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(inViewRef, { once: true, margin: "-10% 0px" });
  const wordsArray = words.split(" ");
  const accentSet = new Set(accent.map((w) => w.toLowerCase()));

  useEffect(() => {
    if (!inView) return;
    animate(
      "span[data-word]",
      { opacity: 1, filter: filter ? "blur(0px)" : "none" },
      { duration: duration ? duration : 1, delay: stagger(0.08) },
    );
  }, [inView, animate, filter, duration]);

  return (
    <span ref={inViewRef} className={cn("block font-semibold", className)}>
      <span className="sr-only">{words}</span>
      <motion.span ref={scope} aria-hidden="true" className="block">
        {wordsArray.map((word, idx) => {
          const isAccent = accentSet.has(word.replace(/[.,:;!?]/g, "").toLowerCase());
          return (
            <motion.span
              key={word + idx}
              data-word
              className={cn(
                "inline-block opacity-0",
                isAccent && "pr-[0.08em] font-serif font-normal italic text-brand-soft",
                wordClassName,
              )}
              style={{ filter: filter ? "blur(10px)" : "none" }}
            >
              {word}
              {idx < wordsArray.length - 1 ? " " : ""}
            </motion.span>
          );
        })}
      </motion.span>
    </span>
  );
};
