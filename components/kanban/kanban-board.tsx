"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/panel";
import { KanbanBoardSkeleton } from "@/components/dashboard/skeletons";
import { ErrorState } from "@/components/dashboard/panel";
import { BulkBar } from "@/components/kanban/bulk-bar";
import { BulkConfirmDialog } from "@/components/kanban/bulk-confirm-dialog";
import { CreateOrderDialog } from "@/components/kanban/create-order-dialog";
import { CardFace } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api/client";
import { ORDER_STATUSES, type CreateOrderInput, type KanbanCard, type OrderStatus } from "@/lib/api/schemas";
import { useKanbanBoard } from "@/lib/hooks/use-api";
import {
  findContainer,
  insertCard,
  isStatus,
  locate,
  moveCard,
  patchCard,
  summarizeSelection,
  toBoardState,
  toKanbanBoard,
  type BoardState,
} from "@/lib/kanban";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Con puntero: lo que está bajo el cursor. Con teclado (sin coordenadas): esquinas más cercanas. */
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : closestCorners(args);
};

type Origin = { status: OrderStatus; index: number; version: number; snapshot: BoardState };

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Error desconocido");

export function KanbanBoard() {
  const { data, error, mutate, isValidating } = useKanbanBoard();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [board, setBoard] = useState<BoardState | null>(null);
  const boardRef = useRef<BoardState | null>(null);
  const pendingRef = useRef(0);
  const originRef = useRef<Origin | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  /** Punto de agarre dentro de la tarjeta (para que la inclinación no lo desplace). */
  const [grabOrigin, setGrabOrigin] = useState<{ x: string; y: string }>({ x: "50%", y: "50%" });
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTarget, setBulkTarget] = useState<OrderStatus | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  /** Toda escritura al tablero pasa por aquí para que boardRef siempre esté al día. */
  const apply = useCallback((fn: (b: BoardState) => BoardState) => {
    if (!boardRef.current) return;
    const next = fn(boardRef.current);
    boardRef.current = next;
    setBoard(next);
  }, []);
  const replace = useCallback((next: BoardState) => {
    boardRef.current = next;
    setBoard(next);
  }, []);

  // Hidratación desde el servidor (persistencia): sólo si no hay mutaciones ni arrastre en curso.
  useEffect(() => {
    if (data && pendingRef.current === 0 && !originRef.current) replace(toBoardState(data));
  }, [data, replace]);

  // ?new=1 (desde topbar o ⌘K) abre el diálogo de creación.
  useEffect(() => {
    if (params.get("new") === "1") {
      setCreateOpen(true);
      router.replace(pathname, { scroll: false });
    }
  }, [params, pathname, router]);

  // Esc limpia la selección.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !bulkTarget && !createOpen) setSelected(new Set());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bulkTarget, createOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const cardById = useCallback((id: string): KanbanCard | undefined => {
    const b = boardRef.current;
    const loc = b && locate(b, id);
    return loc ? b![loc.status][loc.index] : undefined;
  }, []);

  const shake = (id: string) => {
    setShakingId(id);
    window.setTimeout(() => setShakingId((s) => (s === id ? null : s)), 650);
  };

  const syncCache = useCallback(() => {
    if (boardRef.current) void mutate(toKanbanBoard(boardRef.current), { revalidate: false });
  }, [mutate]);

  const reloadFromServer = useCallback(async () => {
    const fresh = await mutate();
    if (fresh) replace(toBoardState(fresh));
  }, [mutate, replace]);

  /* ─────────────── Drag & Drop ─────────────── */

  const onDragStart = ({ active, activatorEvent }: DragStartEvent) => {
    const b = boardRef.current;
    const id = String(active.id);
    const loc = b && locate(b, id);
    if (!b || !loc) return;
    originRef.current = { ...loc, version: b[loc.status][loc.index]!.version, snapshot: b };
    // active.rect aún no está medido en onDragStart: se mide el nodo de la tarjeta agarrada.
    const ev = activatorEvent as PointerEvent | MouseEvent | KeyboardEvent;
    const node = ev.target instanceof Element ? ev.target.closest("[data-version]") : null;
    const rect = node?.getBoundingClientRect();
    setGrabOrigin(
      rect && "clientX" in ev
        ? { x: `${ev.clientX - rect.left}px`, y: `${ev.clientY - rect.top}px` }
        : { x: "50%", y: "50%" },
    );
    setActiveId(id);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    const b = boardRef.current;
    if (!b || !over) return;
    const id = String(active.id);
    const overId = String(over.id);
    const from = findContainer(b, id);
    const to = findContainer(b, overId);
    if (!from || !to || from === to) return;
    const overIndex = b[to].findIndex((c) => c.id === overId);
    const translated = active.rect.current.translated;
    const below = translated && over.rect ? translated.top > over.rect.top + over.rect.height / 2 : false;
    const index = overIndex >= 0 ? overIndex + (below ? 1 : 0) : b[to].length;
    apply((cur) => moveCard(cur, id, to, index));
  };

  const commitMove = async (id: string, origin: Origin, toStatus: OrderStatus, toIndex: number) => {
    const card = cardById(id);
    const label = STATUS_META[toStatus].label;
    pendingRef.current += 1;
    try {
      const res = await api.moveOrder(id, { toStatus, toPosition: toIndex, version: origin.version });
      apply((b) => patchCard(b, id, { version: res.data.version, updatedAt: res.data.updatedAt, status: res.data.status }));
      syncCache();
      toast.success(`${card?.orderNumber ?? "Orden"} → ${label}`, {
        description: `Guardado en ${Math.round(res.latencyMs)} ms`,
      });
    } catch (e) {
      if (e instanceof ApiError && e.isConflict) {
        toast.warning("Conflicto de versión (409)", {
          description: "La orden fue modificada en otra sesión. Recargamos el tablero con el estado actual.",
        });
        await reloadFromServer();
        return;
      }
      // Rollback de ESTA tarjeta a su lugar original (no pisa otros cambios en curso).
      apply((b) => moveCard(b, id, origin.status, origin.index));
      shake(id);
      toast.error(`No se pudo mover ${card?.orderNumber ?? "la orden"}`, {
        description: `${errMsg(e)}. El cambio se revirtió.`,
      });
    } finally {
      pendingRef.current -= 1;
    }
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const origin = originRef.current;
    originRef.current = null;
    setActiveId(null);
    const b = boardRef.current;
    const id = String(active.id);
    if (!origin || !b) return;
    if (!over) {
      replace(origin.snapshot);
      return;
    }
    const container = findContainer(b, id);
    if (!container) return;
    const overId = String(over.id);
    if (findContainer(b, overId) === container && !isStatus(overId)) {
      const oldIndex = b[container].findIndex((c) => c.id === id);
      const newIndex = b[container].findIndex((c) => c.id === overId);
      if (newIndex >= 0 && oldIndex !== newIndex) apply((cur) => moveCard(cur, id, container, newIndex));
    }
    const final = locate(boardRef.current!, id)!;
    if (final.status === origin.status && final.index === origin.index) return;
    void commitMove(id, origin, final.status, final.index);
  };

  const onDragCancel = () => {
    if (originRef.current) replace(originRef.current.snapshot);
    originRef.current = null;
    setActiveId(null);
  };

  const announcements: Announcements = useMemo(
    () => ({
      onDragStart: ({ active }) => `Tomaste la orden ${cardById(String(active.id))?.orderNumber ?? ""}.`,
      onDragOver: ({ active, over }) => {
        const to = over && boardRef.current ? findContainer(boardRef.current, String(over.id)) : null;
        return to
          ? `${cardById(String(active.id))?.orderNumber ?? "La orden"} está sobre ${STATUS_META[to].label}.`
          : "Fuera de una columna.";
      },
      onDragEnd: ({ over }) => {
        const to = over && boardRef.current ? findContainer(boardRef.current, String(over.id)) : null;
        return to ? `Soltaste la orden en ${STATUS_META[to].label}.` : "Soltaste la orden fuera del tablero.";
      },
      onDragCancel: () => "Movimiento cancelado; la orden volvió a su lugar.",
    }),
    [cardById],
  );

  /* ─────────────── Selección y bulk ─────────────── */

  const toggleSelect = useCallback((id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleColumn = useCallback((status: OrderStatus, select: boolean) => {
    const ids = boardRef.current?.[status].map((c) => c.id) ?? [];
    setSelected((s) => {
      const next = new Set(s);
      ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
      return next;
    });
  }, []);

  const confirmBulk = async () => {
    if (!bulkTarget) return;
    const ids = [...selected];
    const label = STATUS_META[bulkTarget].label;
    setBulkPending(true);
    try {
      const res = await api.bulkUpdate({ ids, patch: { status: bulkTarget } });
      await reloadFromServer();
      setSelected(new Set());
      setBulkTarget(null);
      toast.success(`${res.data.updated} órdenes actualizadas`, { description: `Nuevo estado: ${label}` });
    } catch (e) {
      toast.error("Actualización masiva fallida", {
        description: `No se aplicó ningún cambio (operación atómica). ${errMsg(e)}`,
      });
    } finally {
      setBulkPending(false);
    }
  };

  /* ─────────────── Crear ─────────────── */

  const createOrder = async (input: CreateOrderInput) => {
    try {
      const res = await api.createOrder(input);
      apply((b) => insertCard(b, res.data, 0));
      syncCache();
      setCreateOpen(false);
      setHighlightId(res.data.id);
      window.setTimeout(() => setHighlightId(null), 2200);
      toast.success(`Orden ${res.data.orderNumber} creada`, {
        description: `${STATUS_META[res.data.status].label} · ${input.customerName}`,
      });
    } catch (e) {
      toast.error("No se pudo crear la orden", { description: errMsg(e) });
      throw e;
    }
  };

  const activeCard = activeId ? cardById(activeId) : undefined;
  const total = board ? ORDER_STATUSES.reduce((a, s) => a + board[s].length, 0) : 0;

  return (
    <div className="mx-auto max-w-[1600px]">
      <PageHeader
        title="Kanban"
        description="Arrastra para cambiar el estado o reordenar. Usa espacio + flechas para moverlas con el teclado."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void reloadFromServer()}
              aria-label="Recargar tablero"
              className="h-8"
            >
              <RefreshCw className={cn("size-3.5", isValidating && "opacity-40")} /> Recargar
            </Button>
            <Button size="sm" className="h-8" data-testid="order-create-open" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" /> Nueva orden
            </Button>
          </>
        }
      />

      {error && !board ? (
        <ErrorState message={error.message} onRetry={() => void mutate()} />
      ) : !board ? (
        <KanbanBoardSkeleton />
      ) : (
        <>
          <p className="sr-only" aria-live="polite">
            {total} órdenes en el tablero. {selected.size} seleccionadas.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
            accessibility={{
              announcements,
              screenReaderInstructions: {
                draggable:
                  "Para tomar una orden presiona espacio o enter. Usa las flechas para moverla entre columnas y posiciones. Presiona espacio o enter para soltarla, o escape para cancelar.",
              },
            }}
          >
            <div
              className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-6 md:-mx-8 md:scroll-px-8 md:px-8 xl:snap-none"
              role="region"
              aria-label="Tablero Kanban"
            >
              {ORDER_STATUSES.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  cards={board[status]}
                  selected={selected}
                  onToggleSelect={toggleSelect}
                  onToggleColumn={toggleColumn}
                  shakingId={shakingId}
                  highlightId={highlightId}
                  layoutEnabled={activeId === null}
                />
              ))}
            </div>
            {/* Portal a <body>: la transición de página (template.tsx) deja transform/filter
                en un ancestro, que se vuelve el containing block del overlay (position: fixed)
                y lo desplazaba respecto al cursor. */}
            {typeof document !== "undefined" &&
              createPortal(
                <DragOverlay dropAnimation={{ duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
                  {activeCard ? (
                    <motion.div
                      initial={{ rotate: 0, scale: 1 }}
                      animate={{ rotate: 3, scale: 1.04 }}
                      style={{ originX: grabOrigin.x, originY: grabOrigin.y }}
                      className="cursor-grabbing"
                    >
                      <CardFace card={activeCard} selected={selected.has(activeCard.id)} overlay />
                    </motion.div>
                  ) : null}
                </DragOverlay>,
                document.body,
              )}
          </DndContext>
        </>
      )}

      <BulkBar count={selected.size} onPick={setBulkTarget} onClear={() => setSelected(new Set())} />
      <BulkConfirmDialog
        target={bulkTarget}
        count={selected.size}
        origins={board ? summarizeSelection(board, selected) : new Map()}
        pending={bulkPending}
        onConfirm={() => void confirmBulk()}
        onOpenChange={(o) => !o && setBulkTarget(null)}
      />
      <CreateOrderDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={createOrder} />
    </div>
  );
}
