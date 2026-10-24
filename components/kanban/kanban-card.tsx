"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { Clock, ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { memo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { KanbanCard as Card } from "@/lib/api/schemas";
import { avatarDataUri } from "@/lib/avatar";
import { marginRatio } from "@/lib/finance";
import { formatCurrency, formatPercent, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

function marginTone(ratio: number) {
  if (ratio >= 0.5) return "text-success bg-success/10 border-success/25";
  if (ratio >= 0.35) return "text-brand-soft bg-brand/10 border-brand/25";
  return "text-ember bg-ember/10 border-ember/25";
}

export const CardFace = memo(function CardFace({
  card,
  selected,
  onToggleSelect,
  overlay,
}: {
  card: Card;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  overlay?: boolean;
}) {
  const ratio = marginRatio(card.margin, card.total);
  return (
    <div
      className={cn(
        "group/card relative rounded-xl border bg-gradient-to-b from-[#16161f] to-[#111118] p-3 text-left transition-[border-color,box-shadow]",
        selected ? "border-brand/60 shadow-[0_0_0_1px_rgb(124_92_255/0.4),0_8px_24px_-12px_rgb(124_92_255/0.6)]" : "border-white/[0.07] hover:border-white/15",
        overlay && "border-brand/50 shadow-[0_30px_60px_-15px_rgb(0_0_0/0.9),0_0_0_1px_rgb(124_92_255/0.35)]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-white/55">{card.orderNumber}</span>
        <div className="flex items-center gap-2">
          <span className={cn("rounded-md border px-1.5 py-px font-mono text-[10px]", marginTone(ratio))}>
            {formatPercent(ratio, { digits: 0 })} mg
          </span>
          {onToggleSelect && (
            <Checkbox
              checked={!!selected}
              onCheckedChange={() => onToggleSelect(card.id)}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              aria-label={`Seleccionar ${card.orderNumber}`}
              data-testid={`kanban-select-${card.orderNumber}`}
              className={cn(
                "size-4 border-white/25 transition-opacity",
                !selected && "opacity-60 group-hover/card:opacity-100",
              )}
            />
          )}
          <Link
            href={`/dashboard/orders/${encodeURIComponent(card.id)}`}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            aria-label={`Ver detalle de ${card.orderNumber}`}
            className="grid size-6 place-items-center rounded-md text-white/35 opacity-60 transition hover:bg-white/[0.07] hover:text-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand group-hover/card:opacity-100"
          >
            <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </div>
      <div className="mt-2 truncate text-sm font-medium text-white">{card.customerName}</div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="font-mono text-[15px] text-white tabular">{formatCurrency(card.total)}</div>
          {card.updatedAt && (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-white/40">
              <Clock className="size-3" /> {formatRelativeTime(card.updatedAt)}
            </div>
          )}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarDataUri(card.customerName, "#2a2a3d", "#44445f")} alt="" className="size-6 rounded-full ring-1 ring-white/10" />
      </div>
    </div>
  );
});

export function SortableKanbanCard({
  card,
  selected,
  onToggleSelect,
  shaking,
  highlight,
  layoutEnabled,
  dragDisabled = false,
}: {
  card: Card;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  shaking: boolean;
  highlight: boolean;
  layoutEnabled: boolean;
  dragDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", status: card.status },
    attributes: { roleDescription: "tarjeta arrastrable" },
    disabled: dragDisabled,
  });

  return (
    <motion.div
      layout={layoutEnabled ? "position" : false}
      initial={highlight ? { opacity: 0, scale: 0.9, y: -12 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
    >
      <div
        ref={setNodeRef}
        style={{ transform: CSS.Translate.toString(transform), transition }}
        data-testid={`kanban-card-${card.orderNumber}`}
        data-status={card.status}
        data-version={card.version}
        aria-label={`${card.orderNumber}, ${card.customerName}, ${formatCurrency(card.total)}`}
        className={cn(
          "cursor-grab touch-none rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand active:cursor-grabbing",
          isDragging && "opacity-30",
          shaking && "animate-shake",
          highlight && "rounded-xl ring-2 ring-brand/60 transition-shadow duration-1000",
        )}
        {...attributes}
        {...listeners}
      >
        <CardFace card={card} selected={selected} onToggleSelect={onToggleSelect} />
      </div>
    </motion.div>
  );
}
