"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError, api } from "@/lib/api/client";
import { updateOrderItemsInputSchema, type BackendOrderDetail } from "@/lib/api/schemas";

export type OrderDraftLine = { clientId: string; productId: string; quantity: number };
export type OrderDraft = { orderId: string; baseVersion: number; lines: OrderDraftLine[]; conflict: boolean };

let lineSeq = 0;
/** ID estable por línea del borrador (sólo cliente): no depende del índice ni de secure context. */
function nextLineId() {
  lineSeq += 1;
  return `line-${lineSeq}`;
}

/**
 * Borrador del editor de artículos. La versión pertenece al borrador: se fija al abrir
 * el editor y ninguna revalidación de SWR la cambia. Ante 409 el borrador queda en
 * conflicto y no se puede reenviar hasta que el usuario recargue explícitamente (begin).
 * El doble envío se bloquea con una ref síncrona, anterior al primer await.
 */
export function useOrderDraft() {
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const begin = useCallback((order: BackendOrderDetail) => {
    if (savingRef.current) return;
    setDraft({
      orderId: order.id,
      baseVersion: order.version,
      conflict: false,
      lines: order.items.map((line) => ({ clientId: nextLineId(), productId: line.productId, quantity: line.quantity })),
    });
  }, []);

  const editLines = useCallback((update: (lines: OrderDraftLine[]) => OrderDraftLine[]) => {
    if (savingRef.current) return;
    setDraft((current) => (current && !current.conflict ? { ...current, lines: update(current.lines) } : current));
  }, []);

  const cancel = useCallback(() => {
    if (!savingRef.current) setDraft(null);
  }, []);

  /** Devuelve null si no hay nada que enviar (sin borrador, en conflicto o ya enviando). */
  const save = useCallback(async () => {
    if (!draft || draft.conflict || savingRef.current) return null;
    const input = updateOrderItemsInputSchema.parse({
      expectedVersion: draft.baseVersion,
      items: draft.lines.map(({ productId, quantity }) => ({ productId, quantity })),
    });
    savingRef.current = true;
    setSaving(true);
    try {
      const result = await api.updateOrderItems(draft.orderId, input);
      setDraft(null);
      return result;
    } catch (error) {
      if (error instanceof ApiError && error.isConflict) {
        setDraft((current) => (current ? { ...current, conflict: true } : current));
      }
      throw error;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [draft]);

  const addLine = useCallback(
    (productId: string) => editLines((lines) => [...lines, { clientId: nextLineId(), productId, quantity: 1 }]),
    [editLines],
  );

  return { draft, saving, begin, editLines, addLine, cancel, save };
}
