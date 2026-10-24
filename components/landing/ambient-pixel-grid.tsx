"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type AmbientPixelGridProps = {
  gridCols?: number;
  gridRows?: number;
  maxElevation?: number;
  gapRatio?: number;
  backgroundColor?: string;
  borderOpacity?: number;
  /** Detiene el bucle de render (fuera de viewport o con webcam activa). */
  paused?: boolean;
  /** Dibuja un solo frame estático (prefers-reduced-motion). */
  still?: boolean;
  className?: string;
};

/**
 * Fallback sin cámara del hero: mismo lenguaje visual de cubos 3D que
 * WebcamPixelGrid, alimentado por ondas de ruido suaves + elevación con el mouse.
 */
export function AmbientPixelGrid({
  gridCols = 60,
  gridRows = 40,
  maxElevation = 50,
  gapRatio = 0.05,
  backgroundColor = "#030303",
  borderOpacity = 0.06,
  paused = false,
  still = false,
  className,
}: AmbientPixelGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elevationRef = useRef<Float32Array>(new Float32Array(gridCols * gridRows));
  const mouseRef = useRef<{ x: number; y: number; active: number }>({ x: -1, y: -1, active: 0 });
  const timeRef = useRef(0);

  useEffect(() => {
    elevationRef.current = new Float32Array(gridCols * gridRows);
  }, [gridCols, gridRows]);

  // Mouse → coordenadas de celda (escuchado en window para no bloquear el contenido encima).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) {
        mouseRef.current.active = 0;
        return;
      }
      const cell = Math.max(rect.width / gridCols, rect.height / gridRows);
      const offX = (rect.width - cell * gridCols) / 2;
      const offY = (rect.height - cell * gridRows) / 2;
      mouseRef.current = {
        x: (e.clientX - rect.left - offX) / cell,
        y: (e.clientY - rect.top - offY) / cell,
        active: 1,
      };
    };
    const onLeave = () => {
      mouseRef.current.active = 0;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [gridCols, gridRows]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (paused || still) draw(0);
    });
    ro.observe(canvas);

    const draw = (dt: number) => {
      timeRef.current += dt;
      const t = timeRef.current;
      const elev = elevationRef.current;
      const mouse = mouseRef.current;

      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      const cell = Math.max(width / gridCols, height / gridRows);
      const gap = cell * gapRatio;
      const size = cell - gap;
      const offX = (width - cell * gridCols) / 2;
      const offY = (height - cell * gridRows) / 2;
      const cx = gridCols / 2;
      const cy = gridRows / 2;

      for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
          const i = row * gridCols + col;

          // Ondas de "ruido" suaves (suma de senos desfasados, barato y orgánico)
          const n =
            Math.sin(col * 0.16 + t * 0.55) * Math.cos(row * 0.21 - t * 0.42) * 0.55 +
            Math.sin((col + row) * 0.075 + t * 0.33) * 0.35 +
            Math.sin(Math.hypot(col - cx, row - cy) * 0.28 - t * 0.9) * 0.25;

          let target = Math.max(0, n - 0.42) * maxElevation * 0.32;

          if (mouse.active) {
            const d2 = (col - mouse.x) ** 2 + (row - mouse.y) ** 2;
            target += Math.exp(-d2 / 14) * maxElevation * 0.55;
          }

          const current = elev[i]! + (target - elev[i]!) * (still ? 1 : 0.12);
          elev[i] = current;

          // Color: base casi negro, tinte violeta/ámbar según la onda (darken ≈ 0.6)
          const lum = 22 + Math.max(0, n + 0.6) * 16;
          const violet = Math.max(0, Math.sin(col * 0.05 - t * 0.2 + row * 0.04));
          const amber = Math.max(0, Math.cos(row * 0.09 + t * 0.15) * Math.sin(col * 0.03));
          const boost = 1 + current * 0.035;
          const r = Math.min(255, (lum + violet * 22 + amber * 34) * boost);
          const g = Math.min(255, (lum + violet * 12 + amber * 16) * boost);
          const b = Math.min(255, (lum + violet * 46 + amber * 6) * boost);

          const x = offX + col * cell + gap / 2;
          const y = offY + row * cell + gap / 2;
          const ox = -current * 1.2;
          const oy = -current * 1.8;

          if (current > 0.5) {
            ctx.fillStyle = `rgba(0,0,0,${Math.min(0.6, current * 0.04)})`;
            ctx.fillRect(x + current * 1.5, y + current * 2, size, size);

            ctx.fillStyle = `rgb(${Math.max(0, r - 80) | 0},${Math.max(0, g - 80) | 0},${Math.max(0, b - 80) | 0})`;
            ctx.beginPath();
            ctx.moveTo(x + size + ox, y + oy);
            ctx.lineTo(x + size, y);
            ctx.lineTo(x + size, y + size);
            ctx.lineTo(x + size + ox, y + size + oy);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = `rgb(${Math.max(0, r - 50) | 0},${Math.max(0, g - 50) | 0},${Math.max(0, b - 50) | 0})`;
            ctx.beginPath();
            ctx.moveTo(x + ox, y + size + oy);
            ctx.lineTo(x, y + size);
            ctx.lineTo(x + size, y + size);
            ctx.lineTo(x + size + ox, y + size + oy);
            ctx.closePath();
            ctx.fill();
          }

          ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
          ctx.fillRect(x + ox, y + oy, size, size);
          ctx.strokeStyle = `rgba(255,255,255,${borderOpacity + current * 0.008})`;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x + ox, y + oy, size, size);
        }
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!document.hidden) draw(dt);
      raf = requestAnimationFrame(loop);
    };

    if (still || paused) {
      draw(still ? 0.016 : 0);
    } else {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [paused, still, gridCols, gridRows, maxElevation, gapRatio, backgroundColor, borderOpacity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("block h-full w-full", className)}
      style={{ backgroundColor }}
    />
  );
}
