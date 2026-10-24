"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { AmbientPixelGrid } from "@/components/landing/ambient-pixel-grid";
import { useInViewport } from "@/hooks/use-in-viewport";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

// La webcam sólo se carga en el cliente y sólo en la landing (nunca en /dashboard).
const WebcamPixelGrid = dynamic(
  () => import("@/components/ui/webcam-pixel-grid").then((m) => m.WebcamPixelGrid),
  { ssr: false },
);

/**
 * checking    → validando soporte/permisos
 * pending     → WebcamPixelGrid montado, esperando onWebcamReady
 * live        → webcam visible
 * parked      → hero fuera de pantalla: componente desmontado y pistas detenidas
 * unavailable → sin cámara / denegada / sin HTTPS → sólo AmbientPixelGrid
 */
export type CameraStatus = "checking" | "pending" | "live" | "parked" | "unavailable";

/**
 * Envuelve WebcamPixelGrid (sin modificarlo) con:
 *  - AmbientPixelGrid mientras no haya cámara (denegada, inexistente o sin HTTPS)
 *  - cambio a webcam sólo cuando dispara onWebcamReady
 *  - pausa del render y detención de las pistas al salir del viewport
 */
export function HeroBackground({
  sectionRef,
  onStatusChange,
}: {
  sectionRef: RefObject<HTMLElement | null>;
  onStatusChange?: (status: CameraStatus) => void;
}) {
  const inView = useInViewport(sectionRef);
  const reducedMotion = usePrefersReducedMotion();
  const [status, setStatus] = useState<CameraStatus>("checking");

  useEffect(() => onStatusChange?.(status), [status, onStatusChange]);

  // Pre-chequeo: contexto seguro, API disponible y permiso no bloqueado.
  useEffect(() => {
    let cancelled = false;
    async function check() {
      const supported =
        typeof window !== "undefined" &&
        window.isSecureContext &&
        typeof navigator.mediaDevices?.getUserMedia === "function";
      if (!supported) {
        if (!cancelled) setStatus("unavailable");
        return;
      }
      try {
        const perm = await navigator.permissions?.query({ name: "camera" as PermissionName });
        if (perm?.state === "denied") {
          if (!cancelled) setStatus("unavailable");
          return;
        }
      } catch {
        /* Safari/Firefox antiguos no soportan "camera": se intenta igual */
      }
      if (!cancelled) setStatus("pending");
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleReady = useCallback(() => setStatus("live"), []);
  // AbortError = play() interrumpido por un remontaje (StrictMode / re-entrada al viewport):
  // es transitorio, el siguiente intento resuelve. El resto (NotAllowed, NotFound,
  // NotReadable, Security…) significa que no hay cámara utilizable.
  const handleError = useCallback((err: Error) => {
    if (err.name === "AbortError") return;
    setStatus("unavailable");
  }, []);

  // Fuera de pantalla → desmontar (el cleanup del componente detiene las pistas).
  // De vuelta en pantalla → remontar (sin prompt si el permiso ya fue concedido).
  // En "pending" se mantiene montado aunque salga del viewport para no dejar
  // un getUserMedia a medias sin dueño; al resolverse pasa a live → parked.
  useEffect(() => {
    if (status === "live" && !inView) setStatus("parked");
    if (status === "parked" && inView) setStatus("pending");
  }, [status, inView]);

  const mountWebcam = status === "pending" || status === "live";
  const webcamVisible = status === "live" && inView;

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-1000",
          webcamVisible ? "opacity-0" : "opacity-100",
        )}
      >
        <AmbientPixelGrid
          gridCols={60}
          gridRows={40}
          maxElevation={50}
          gapRatio={0.05}
          backgroundColor="#030303"
          borderOpacity={0.06}
          paused={!inView || webcamVisible}
          still={reducedMotion}
        />
      </div>

      {mountWebcam && (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            webcamVisible ? "opacity-100" : "opacity-0",
          )}
        >
          <WebcamPixelGrid
            gridCols={60}
            gridRows={40}
            maxElevation={50}
            motionSensitivity={0.25}
            elevationSmoothing={0.2}
            colorMode="webcam"
            backgroundColor="#030303"
            mirror
            gapRatio={0.05}
            invertColors={false}
            darken={0.6}
            borderColor="#ffffff"
            borderOpacity={0.06}
            className="h-full w-full"
            onWebcamReady={handleReady}
            onWebcamError={handleError}
          />
        </div>
      )}
    </div>
  );
}
