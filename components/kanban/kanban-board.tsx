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
import { useSWRConfig } from "swr";
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
import { ApiError } from "@/lib/api/client";
import { ORDER_STATUSES, type CreateOrderInput, type KanbanCard, type OrderStatus } from "@/lib/api/schemas";
import { useKanbanController } from "@/components/kanban/use-kanban-controller";
import { isAnalyticsKey, useProducts } from "@/lib/hooks/use-api";
import { useReturnFocus } from "@/lib/hooks/use-return-focus";
import {
  findContainer,
  isStatus,
  locate,
  moveCard,
  summarizeSelection,
  toBoardState,
  type BoardState,
} from "@/lib/kanban";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

/** Con puntero: lo que está bajo el cursor. Con teclado (sin coordenadas): esquinas más cercanas. */
const collisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  return hits.length > 0 ? hits : closestCorners(args);
};

/** Tarjeta agarrada tal como estaba en el estado confirmado al empezar el arrastre. */
type Origin = { status: OrderStatus; index: number; card: KanbanCard };

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Error desconocido");

export function KanbanBoard() {
  const kanban = useKanbanController();
  const { data, error, isValidating, phase } = kanban;
  const { mutate: mutateGlobal } = useSWRConfig();
  const productsQuery = useProducts();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  /** Estado confirmado: siempre derivado de la caché SWR. */
  const confirmed = useMemo(() => (data ? toBoardState(data) : null), [data]);
  /** Preview efímero del arrastre en curso; cancelar sólo lo descarta. */
  const [preview, setPreview] = useState<BoardState | null>(null);
  const previewRef = useRef<BoardState | null>(null);
  const originRef = useRef<Origin | null>(null);
  const board = preview ?? confirmed;
  const boardRef = useRef<BoardState | null>(board);
  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  const [activeId, setActiveId] = useState<string | null>(null);
  /** Punto de agarre dentro de la tarjeta (para que la inclinación no lo desplace). */
  const [grabOrigin, setGrabOrigin] = useState<{ x: string; y: string }>({ x: "50%", y: "50%" });
  const [shakingId, setShakingId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTarget, setBulkTarget] = useState<OrderStatus | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  // Destinos de foco estables cuando el invocador no existe (?new=1, barra de bulk ya oculta).
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const boardRegionRef = useRef<HTMLDivElement>(null);
  const createReturnFocus = useReturnFocus(createOpen, createButtonRef);
  const bulkAppliedRef = useRef(false);
  const bulkReturnFocus = useReturnFocus(bulkTarget !== null, boardRegionRef, bulkAppliedRef);
  /** Escrituras bloqueadas mientras otra está pendiente o el tablero no está sincronizado. */
  const writesLocked = phase !== "idle";

  const updatePreview = useCallback((fn: (b: BoardState) => BoardState) => {
    if (!previewRef.current) return;
    const next = fn(previewRef.current);
    previewRef.current = next;
    setPreview(next);
  }, []);
  const clearPreview = useCallback(() => {
    previewRef.current = null;
    setPreview(null);
    kanban.draggingRef.current = false;
  }, [kanban.draggingRef]);

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
    const b = previewRef.current ?? boardRef.current;
    const loc = b && locate(b, id);
    return loc ? b![loc.status][loc.index] : undefined;
  }, []);

  /** Timeouts de feedback visual: se cancelan al reprogramarse y al desmontar. */
  const shakeTimer = useRef<number | undefined>(undefined);
  const highlightTimer = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(shakeTimer.current);
      window.clearTimeout(highlightTimer.current);
    },
    [],
  );

  const shake = (id: string) => {
    setShakingId(id);
    window.clearTimeout(shakeTimer.current);
    shakeTimer.current = window.setTimeout(() => setShakingId((s) => (s === id ? null : s)), 650);
  };

  /** El highlight pertenece al ID vigente: el timeout de un alta anterior no borra el de la nueva. */
  const highlight = (id: string) => {
    setHighlightId(id);
    window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightId((h) => (h === id ? null : h)), 2200);
  };

  const reloadFromServer = useCallback(() => kanban.reload(), [kanban]);

  /** Los cambios de pedidos recalculan métricas en el backend: invalida KPIs y gráficas cacheadas. */
  const refreshAnalytics = useCallback(() => void mutateGlobal(isAnalyticsKey), [mutateGlobal]);

  /* ─────────────── Drag & Drop ─────────────── */

  const onDragStart = ({ active, activatorEvent }: DragStartEvent) => {
    const b = confirmed;
    const id = String(active.id);
    const loc = b && locate(b, id);
    if (!b || !loc || kanban.phaseRef.current !== "idle") return;
    kanban.draggingRef.current = true;
    originRef.current = { ...loc, card: b[loc.status][loc.index]! };
    previewRef.current = b;
    setPreview(b);
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
    const b = previewRef.current;
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
    updatePreview((cur) => moveCard(cur, id, to, index));
  };

  const commitMove = async (card: KanbanCard, toStatus: OrderStatus, toIndex: number) => {
    const label = STATUS_META[toStatus].label;
    const outcome = await kanban.move(card, toStatus, toIndex);
    if (outcome.blocked) {
      toast.info("Hay una operación en curso", { description: "Espera a que termine antes de mover otra orden." });
      return;
    }
    if (outcome.write === "saved") {
      refreshAnalytics();
      if (outcome.synchronized) {
        toast.success(`${card.orderNumber} → ${label}`, {
          description: `Guardado en ${Math.round(outcome.data.latencyMs)} ms`,
        });
      } else {
        toast.warning(`${card.orderNumber} → ${label}`, {
          description: "Guardado; sincronización pendiente. El tablero conserva el cambio confirmado.",
        });
      }
      return;
    }
    if (outcome.error instanceof ApiError && outcome.error.isConflict) {
      toast.warning("Conflicto de versión (409)", {
        description: outcome.synchronized
          ? "La orden fue modificada en otra sesión. Recargamos el tablero con el estado actual."
          : "La orden fue modificada en otra sesión. No se pudo recargar el tablero; sincronización pendiente.",
      });
      return;
    }
    shake(card.id);
    if (outcome.write === "rejected") {
      toast.error(`No se pudo mover ${card.orderNumber}`, {
        description: `${errMsg(outcome.error)}. La orden se mantuvo en su lugar.`,
      });
    } else if (outcome.synchronized) {
      // 5xx/red: no se afirma un rollback del servidor; se muestra lo que el servidor reporta.
      toast.error(`No se pudo mover ${card.orderNumber}`, {
        description: `${errMsg(outcome.error)}. El tablero muestra el estado actual del servidor.`,
      });
    } else {
      toast.error(`No se pudo confirmar el movimiento de ${card.orderNumber}`, {
        description: `${errMsg(outcome.error)}. No sabemos si se aplicó; sincroniza el tablero antes de continuar.`,
      });
    }
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const origin = originRef.current;
    originRef.current = null;
    setActiveId(null);
    const b = previewRef.current;
    const id = String(active.id);
    if (!origin || !b || !over) {
      clearPreview();
      return;
    }
    let final = b;
    const container = findContainer(b, id);
    const overId = String(over.id);
    if (container && findContainer(b, overId) === container && !isStatus(overId)) {
      const oldIndex = b[container].findIndex((c) => c.id === id);
      const newIndex = b[container].findIndex((c) => c.id === overId);
      if (newIndex >= 0 && oldIndex !== newIndex) final = moveCard(b, id, container, newIndex);
    }
    // El preview se descarta; el movimiento pasa al coordinador como dato optimista en la caché.
    clearPreview();
    const target = locate(final, id);
    if (!target || (target.status === origin.status && target.index === origin.index)) return;
    void commitMove(origin.card, target.status, target.index);
  };

  const onDragCancel = () => {
    originRef.current = null;
    setActiveId(null);
    clearPreview();
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
    if (!bulkTarget || bulkPending) return;
    const ids = [...selected];
    const label = STATUS_META[bulkTarget].label;
    setBulkPending(true);
    try {
      const outcome = await kanban.bulk({ ids, patch: { status: bulkTarget } });
      if (outcome.blocked) {
        toast.info("Hay una operación en curso en el tablero", { description: "Espera a que termine e inténtalo de nuevo." });
        return;
      }
      if (outcome.write === "saved") {
        refreshAnalytics();
        bulkAppliedRef.current = true; // la barra de selección que lo abrió se oculta
        setSelected(new Set());
        setBulkTarget(null);
        if (outcome.synchronized) {
          toast.success(`${outcome.data.data.updated} órdenes actualizadas`, { description: `Nuevo estado: ${label}` });
        } else {
          toast.warning(`${outcome.data.data.updated} órdenes actualizadas`, {
            description: `Nuevo estado: ${label}. Guardado; sincronización pendiente.`,
          });
        }
        return;
      }
      if (outcome.write === "rejected") {
        // 4xx: el backend rechazó la transacción completa.
        toast.error("Actualización masiva rechazada", {
          description: `No se aplicó ningún cambio (operación atómica). ${errMsg(outcome.error)}`,
        });
      } else {
        // 5xx/red: el cliente no puede afirmar que el servidor no aplicó el cambio.
        toast.error("No se pudo confirmar la actualización masiva", {
          description: outcome.synchronized
            ? `${errMsg(outcome.error)}. El tablero muestra el estado actual del servidor.`
            : `${errMsg(outcome.error)}. No sabemos si se aplicó; sincroniza el tablero antes de reintentar.`,
        });
      }
    } finally {
      setBulkPending(false);
    }
  };

  /* ─────────────── Crear ─────────────── */

  const createOrder = async (input: CreateOrderInput) => {
    const outcome = await kanban.create(input);
    if (outcome.blocked) {
      toast.info("Hay una operación en curso en el tablero", { description: "Espera a que termine e inténtalo de nuevo." });
      throw new Error("Escritura bloqueada");
    }
    if (outcome.write !== "saved") {
      if (outcome.write === "rejected") {
        toast.error("No se pudo crear la orden", { description: errMsg(outcome.error) });
      } else {
        toast.error("No se pudo confirmar la creación de la orden", {
          description: outcome.synchronized
            ? `${errMsg(outcome.error)}. Revisa el tablero actualizado antes de reintentar: la orden pudo haberse creado.`
            : `${errMsg(outcome.error)}. No sabemos si se creó; sincroniza el tablero antes de reintentar.`,
        });
      }
      throw outcome.error;
    }
    const res = outcome.data;
    refreshAnalytics();
    setCreateOpen(false);
    highlight(res.data.id);
    toast.success(`Orden ${res.data.orderNumber} creada`, {
      description: `${STATUS_META[res.data.status].label} · ${input.customerName}`,
    });
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
              disabled={phase === "saving" || phase === "refreshing"}
              onClick={() => void reloadFromServer()}
              aria-label="Recargar tablero"
              className="h-8"
            >
              <RefreshCw className={cn("size-3.5", isValidating && "opacity-40")} /> Recargar
            </Button>
            <Button ref={createButtonRef} size="sm" className="h-8" data-testid="order-create-open" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" /> Nueva orden
            </Button>
          </>
        }
      />

      {error && !board ? (
        <ErrorState message={error.message} onRetry={() => void reloadFromServer()} />
      ) : !board ? (
        <KanbanBoardSkeleton />
      ) : (
        <>
          {phase === "needs-sync" ? (
            <SyncBanner
              message="El tablero no está sincronizado con el servidor. Los cambios confirmados se conservan; las demás acciones se reanudan al sincronizar."
              onRetry={() => void reloadFromServer()}
            />
          ) : error ? (
            <SyncBanner message={`No se pudo actualizar el tablero: ${error.message}`} onRetry={() => void reloadFromServer()} />
          ) : null}
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
              ref={boardRegionRef}
              tabIndex={-1}
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
                  dragDisabled={writesLocked && activeId === null}
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
        onCloseAutoFocus={bulkReturnFocus}
      />
      <CreateOrderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={createOrder}
        onCloseAutoFocus={createReturnFocus}
        products={productsQuery.data?.data.items ?? []}
        productsLoading={!productsQuery.data && !productsQuery.error}
      />
    </div>
  );
}

function SyncBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      data-testid="kanban-sync-banner"
      className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-white/80"
    >
      <span>{message}</span>
      <Button variant="outline" size="sm" className="h-8" onClick={onRetry}>
        <RefreshCw className="size-3.5" /> Sincronizar
      </Button>
    </div>
  );
}
