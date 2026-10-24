"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Inbox } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { SortableKanbanCard } from "@/components/kanban/kanban-card";
import type { KanbanCard, OrderStatus } from "@/lib/api/schemas";
import { formatCurrency } from "@/lib/format";
import { STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

export function KanbanColumn({
  status,
  cards,
  selected,
  onToggleSelect,
  onToggleColumn,
  shakingId,
  highlightId,
  layoutEnabled,
  dragDisabled = false,
}: {
  status: OrderStatus;
  cards: KanbanCard[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleColumn: (status: OrderStatus, select: boolean) => void;
  shakingId: string | null;
  highlightId: string | null;
  layoutEnabled: boolean;
  /** true mientras el coordinador del tablero tiene una escritura pendiente o sin sincronizar. */
  dragDisabled?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { type: "column" } });
  const meta = STATUS_META[status];
  const selectedInCol = cards.filter((c) => selected.has(c.id)).length;
  const all = cards.length > 0 && selectedInCol === cards.length;
  const some = selectedInCol > 0 && !all;
  const total = cards.reduce((a, c) => a + c.total, 0);

  return (
    <section
      ref={setNodeRef}
      data-testid={`kanban-column-${status}`}
      aria-label={`${meta.label}: ${cards.length} órdenes`}
      className={cn(
        "flex w-[min(82vw,300px)] shrink-0 snap-start flex-col rounded-2xl border bg-white/[0.015] transition-colors xl:w-auto xl:min-w-0 xl:flex-1",
        isOver ? "border-brand/40 bg-brand/[0.04]" : "border-white/[0.06]",
      )}
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <span className="size-2 rounded-full" style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }} />
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-white/70 uppercase">{meta.label}</h2>
        <span
          data-testid={`kanban-count-${status}`}
          className="rounded-full bg-white/[0.07] px-2 py-0.5 font-mono text-[11px] text-white/70"
        >
          {cards.length}
        </span>
        <Checkbox
          checked={all ? true : some ? "indeterminate" : false}
          onCheckedChange={(v) => onToggleColumn(status, v === true)}
          disabled={cards.length === 0}
          aria-label={`Seleccionar columna ${meta.label}`}
          data-testid={`kanban-select-column-${status}`}
          className="ml-auto size-4 border-white/25"
        />
      </header>
      <div className="px-3 pb-2 font-mono text-[11px] text-subtle">{formatCurrency(total)}</div>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-[140px] flex-1 flex-col gap-2.5 px-2.5 pb-3">
          {cards.map((card) => (
            <SortableKanbanCard
              key={card.id}
              card={card}
              selected={selected.has(card.id)}
              onToggleSelect={onToggleSelect}
              shaking={shakingId === card.id}
              highlight={highlightId === card.id}
              layoutEnabled={layoutEnabled}
              dragDisabled={dragDisabled}
            />
          ))}
          {cards.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 py-8 text-xs text-subtle">
              <Inbox className="size-5" />
              Suelta órdenes aquí
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
