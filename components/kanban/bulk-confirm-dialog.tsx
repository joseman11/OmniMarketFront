"use client";

import { ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/lib/api/schemas";
import { STATUS_META } from "@/lib/status";

export function BulkConfirmDialog({
  target,
  count,
  origins,
  pending,
  onConfirm,
  onOpenChange,
  onCloseAutoFocus,
}: {
  target: OrderStatus | null;
  count: number;
  origins: Map<OrderStatus, number>;
  pending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  /** Retorno de foco al cerrar (la barra que lo abrió desaparece tras aplicar). */
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const meta = target ? STATUS_META[target] : null;
  return (
    <Dialog open={target !== null} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent onCloseAutoFocus={onCloseAutoFocus} className="border-white/10 bg-[#0e0e15] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar actualización masiva</DialogTitle>
          <DialogDescription>
            Se cambiarán <strong className="text-white">{count} órdenes</strong> en una sola transacción. Si alguna falla,
            no se aplica ningún cambio.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3" aria-label="Resumen de cambios">
          {[...origins].map(([from, n]) => (
            <li key={from} className="flex items-center gap-3 text-sm">
              <span className="w-8 text-right font-mono text-white/60">{n}×</span>
              <span className="rounded-md px-2 py-0.5 text-xs" style={{ color: STATUS_META[from].color, background: `${STATUS_META[from].color}1a` }}>
                {STATUS_META[from].label}
              </span>
              <ArrowRight className="size-3.5 text-white/30" />
              {meta && (
                <span className="rounded-md px-2 py-0.5 text-xs" style={{ color: meta.color, background: `${meta.color}1a` }}>
                  {meta.label}
                </span>
              )}
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button data-testid="bulk-confirm" onClick={onConfirm} disabled={pending} className="min-w-40">
            {pending ? "Aplicando cambios…" : `Cambiar ${count} a ${meta?.label ?? ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
