"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

export type CameraState =
  | { status: "idle" | "pending" | "live"; error: null }
  | { status: "error"; error: Error };

const DEFAULT_CONSTRAINTS: MediaStreamConstraints = {
  video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
  audio: false,
};

/**
 * Adquiere la cámara con propiedad por ejecución del efecto: cada ejecución es dueña
 * de su stream y lo libera en su cleanup. Si getUserMedia resuelve después del cleanup
 * (unmount, StrictMode, cambio de `enabled`), las pistas se detienen y se descarta.
 * También se libera si play() falla. `retry()` lanza una adquisición nueva.
 */
export function useManagedCamera(
  videoRef: RefObject<HTMLVideoElement | null>,
  enabled = true,
  constraints: MediaStreamConstraints = DEFAULT_CONSTRAINTS,
) {
  const [state, setState] = useState<CameraState>({ status: "idle", error: null });
  const [attempt, setAttempt] = useState(0);
  // Las constraints se leen sólo al adquirir; no deben relanzar la cámara por identidad.
  const [initialConstraints] = useState(constraints);

  useEffect(() => {
    if (!enabled) {
      setState({ status: "idle", error: null });
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    let disposed = false;
    let ownedStream: MediaStream | null = null;

    const release = () => {
      const stream = ownedStream;
      ownedStream = null;
      stream?.getTracks().forEach((track) => track.stop());
      if (stream && video.srcObject === stream) video.srcObject = null;
    };

    setState({ status: "pending", error: null });
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(initialConstraints);
        // El permiso puede resolverse mucho después del cleanup.
        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        ownedStream = stream;
        video.srcObject = stream;
        await video.play();
        if (!disposed) setState({ status: "live", error: null });
      } catch (cause) {
        release();
        if (!disposed) {
          setState({
            status: "error",
            error: cause instanceof Error ? cause : new Error("No se pudo iniciar la cámara"),
          });
        }
      }
    })();

    return () => {
      disposed = true;
      release();
    };
  }, [enabled, videoRef, attempt, initialConstraints]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, retry };
}
