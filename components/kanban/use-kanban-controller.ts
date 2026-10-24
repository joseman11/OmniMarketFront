"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError, api, type ApiResult } from "@/lib/api/client";
import type { KanbanBoard, KanbanCard, OrderStatus } from "@/lib/api/schemas";
import { useKanbanBoard } from "@/lib/hooks/use-api";
import { emptyBoard, moveCard, patchCard, toBoardState, toKanbanBoard } from "@/lib/kanban";

/**
 * idle        → sin escrituras; se permiten move/create/bulk y la revalidación automática.
 * saving      → hay una escritura en vuelo; el resto de escrituras se bloquean.
 * refreshing  → lectura posterior a una escritura (o recarga manual).
 * needs-sync  → la última lectura falló: sólo se permite reintentar la sincronización.
 */
export type KanbanPhase = "idle" | "saving" | "refreshing" | "needs-sync";

/** saved: el servidor confirmó · rejected: 4xx, no se aplicó · unknown: 5xx/red, no se sabe. */
export type WriteResult = "saved" | "rejected" | "unknown";

export type WriteOutcome<T> =
  | { blocked: true }
  | { blocked: false; write: "saved"; data: T; synchronized: boolean; syncError?: unknown }
  | { blocked: false; write: "rejected" | "unknown"; error: unknown; synchronized: boolean; syncError?: unknown };

export function classifyWriteError(error: unknown): Exclude<WriteResult, "saved"> {
  return error instanceof ApiError && error.status >= 400 && error.status < 500 ? "rejected" : "unknown";
}

/**
 * Coordinador único de escritura del tablero. La caché SWR es el estado confirmado;
 * el preview del arrastre vive aparte (en el tablero) y nunca se escribe aquí.
 * Las escrituras se serializan con una ref síncrona: mientras una está pendiente,
 * las demás devuelven { blocked: true } sin tocar la red.
 */
export function useKanbanController() {
  const [phase, setPhaseState] = useState<KanbanPhase>("idle");
  const phaseRef = useRef<KanbanPhase>("idle");
  /** El tablero marca el arrastre en curso para pausar la hidratación automática. */
  const draggingRef = useRef(false);

  const setPhase = useCallback((next: KanbanPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const query = useKanbanBoard({
    // Ninguna revalidación automática pisa una escritura pendiente ni el preview del arrastre.
    isPaused: () => draggingRef.current || phaseRef.current === "saving" || phaseRef.current === "refreshing",
  });
  const { mutate } = query;

  /** Lectura que SÍ propaga su fallo (mutate() sin datos lo atrapa y devuelve la caché). */
  const synchronize = useCallback(async (): Promise<unknown | null> => {
    setPhase("refreshing");
    try {
      await mutate(async () => (await api.getKanbanStatus()).data, {
        revalidate: false,
        rollbackOnError: false,
        throwOnError: true,
      });
      setPhase("idle");
      return null;
    } catch (error) {
      setPhase("needs-sync");
      return error ?? new Error("No se pudo sincronizar el tablero");
    }
  }, [mutate, setPhase]);

  const move = useCallback(
    async (card: KanbanCard, toStatus: OrderStatus, toIndex: number): Promise<WriteOutcome<ApiResult<KanbanCard>>> => {
      if (phaseRef.current !== "idle") return { blocked: true };
      setPhase("saving"); // Bloqueo síncrono, anterior al primer await.
      const optimistic = (current: KanbanBoard) => toKanbanBoard(moveCard(toBoardState(current), card.id, toStatus, toIndex));
      let saved: ApiResult<KanbanCard>;
      try {
        await mutate(
          async (current) => {
            if (!current) throw new Error("Tablero no cargado");
            const result = await api.moveOrder(card.id, { toStatus, toPosition: toIndex, version: card.version });
            saved = result;
            return toKanbanBoard(patchCard(toBoardState(optimistic(current)), card.id, result.data));
          },
          {
            optimisticData: (current) => optimistic(current ?? toKanbanBoard(emptyBoard())),
            populateCache: true,
            revalidate: false,
            // La caché vuelve al último estado confirmado; no se afirma nada sobre el servidor.
            rollbackOnError: true,
            throwOnError: true,
          },
        );
      } catch (error) {
        const write = classifyWriteError(error);
        // Un 4xx distinto de 409 no se aplicó: la caché confirmada ya es correcta.
        if (write === "rejected" && !(error instanceof ApiError && error.isConflict)) {
          setPhase("idle");
          return { blocked: false, write, error, synchronized: true };
        }
        const syncError = await synchronize();
        return { blocked: false, write, error, synchronized: syncError === null, syncError: syncError ?? undefined };
      }
      const syncError = await synchronize();
      return { blocked: false, write: "saved", data: saved!, synchronized: syncError === null, syncError: syncError ?? undefined };
    },
    [mutate, setPhase, synchronize],
  );

  /** Recarga manual o reintento tras needs-sync: sólo lectura, nunca repite escrituras. */
  const reload = useCallback(async () => {
    if (phaseRef.current === "saving" || phaseRef.current === "refreshing") return null;
    return synchronize();
  }, [synchronize]);

  return {
    data: query.data,
    error: query.error,
    isValidating: query.isValidating,
    phase,
    phaseRef,
    draggingRef,
    /** Transitorio: create/bulk todavía escriben fuera del coordinador. */
    mutate,
    move,
    reload,
  };
}
