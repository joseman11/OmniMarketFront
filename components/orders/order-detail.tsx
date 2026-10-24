"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import { ArrowLeft, Plus, Save, Trash2, X } from "lucide-react";
import { ErrorState, PageHeader, Panel } from "@/components/dashboard/panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, api } from "@/lib/api/client";
import { isAnalyticsKey, useProducts } from "@/lib/hooks/use-api";
import type { ApiProduct, BackendOrderDetail, UpdateOrderItemsInput } from "@/lib/api/schemas";
import { formatCurrency, formatPercent, formatRelativeTime } from "@/lib/format";
import { marginRatio } from "@/lib/finance";
import { STATUS_META } from "@/lib/status";

type OrderLineDraft = { productId: string; quantity: number };

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

function OrderLineEditor({
  line,
  index,
  order,
  products,
  onChange,
  onRemove,
  canRemove,
}: {
  line: OrderLineDraft;
  index: number;
  order: BackendOrderDetail;
  products: ApiProduct[];
  onChange: (next: OrderLineDraft) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const existingLine = order.items.find((item) => item.productId === line.productId);
  const selectedProductIsInactive = line.productId === existingLine?.productId && !products.some((item) => item.id === line.productId && item.isActive);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_88px_36px] items-start gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
      <label className="grid min-w-0 gap-1.5 text-xs text-white/45">
        Producto
        <select
          value={line.productId}
          onChange={(event) => onChange({ ...line, productId: event.target.value })}
          className="h-9 min-w-0 rounded-lg border border-white/10 bg-[#15151e] px-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {selectedProductIsInactive && <option value={line.productId} disabled>{existingLine?.product.name} · Inactivo (elige otro)</option>}
          {products.filter((product) => product.isActive).map((product) => <option key={product.id} value={product.id}>{product.name} · {formatCurrency(product.price)}</option>)}
        </select>
      </label>
      <label className="grid gap-1.5 text-xs text-white/45">
        Cantidad
        <Input type="number" inputMode="numeric" min={1} max={99} value={line.quantity} onChange={(event) => onChange({ ...line, quantity: Number(event.target.value) })} />
      </label>
      <Button type="button" variant="ghost" size="icon-sm" className="mt-5" disabled={!canRemove} aria-label={`Quitar artículo ${index + 1}`} onClick={onRemove}><X className="size-4" /></Button>
    </div>
  );
}

export function OrderDetail({ orderId }: { orderId: string }) {
  const { data, error, isLoading, mutate } = useSWR(["order-detail", orderId], () => api.getOrder(orderId));
  const router = useRouter();
  const productsQuery = useProducts(true);
  const products = productsQuery.data?.data.items ?? [];
  const { mutate: mutateGlobal } = useSWRConfig();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<OrderLineDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const order = data?.data.item;

  useEffect(() => {
    if (order && !editing) setDraft(order.items.map((item) => ({ productId: item.productId, quantity: item.quantity })));
  }, [order, editing]);

  const beginEdit = () => {
    if (!order) return;
    setDraft(order.items.map((item) => ({ productId: item.productId, quantity: item.quantity })));
    setEditing(true);
  };

  const cancelEdit = () => {
    if (order) setDraft(order.items.map((item) => ({ productId: item.productId, quantity: item.quantity })));
    setEditing(false);
  };

  const saveItems = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!order || draft.length === 0 || draft.some((line) => !line.productId || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99)) {
      toast.error("Revisa los artículos", { description: "Cada artículo necesita un producto activo y una cantidad entre 1 y 99." });
      return;
    }
    const input: UpdateOrderItemsInput = {
      expectedVersion: order.version,
      items: draft.map((line) => ({ productId: line.productId, quantity: line.quantity })),
    };
    setSaving(true);
    try {
      await api.updateOrderItems(order.id, input);
      setEditing(false);
      await Promise.all([mutate(), mutateGlobal("kanban-board"), mutateGlobal(isAnalyticsKey)]);
      toast.success("Artículos de la orden actualizados", { description: "El total y margen se recalcularon con los precios actuales." });
    } catch (saveError) {
      if (saveError instanceof ApiError && saveError.isConflict) await mutate();
      toast.error("No se pudo actualizar la orden", { description: messageFrom(saveError) });
    } finally {
      setSaving(false);
    }
  };

  const removeOrder = async () => {
    if (!order) return;
    setDeleting(true);
    try {
      await api.deleteOrder(order.id);
      setDeleteOpen(false);
      await Promise.all([mutateGlobal("kanban-board"), mutateGlobal(isAnalyticsKey)]);
      toast.success(`Orden ${order.orderNumber} eliminada`);
      router.push("/dashboard/kanban");
    } catch (deleteError) {
      toast.error("No se pudo eliminar la orden", { description: messageFrom(deleteError) });
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) return <div className="mx-auto max-w-5xl"><Skeleton className="mb-8 h-12 w-80" /><Skeleton className="h-96 rounded-2xl" /></div>;
  if (error || !order) return <div className="mx-auto max-w-5xl"><ErrorState message={messageFrom(error ?? new Error("No se encontró la orden."))} onRetry={() => void mutate()} /><div className="mt-4"><Button asChild variant="outline"><Link href="/dashboard/kanban"><ArrowLeft className="size-4" /> Volver al tablero</Link></Button></div></div>;

  const status = STATUS_META[order.status];
  const productsById = new Map(products.map((product) => [product.id, product]));
  const estimate = draft.reduce((sum, line) => sum + (productsById.get(line.productId)?.price ?? order.items.find((item) => item.productId === line.productId)?.unitPrice ?? 0) * line.quantity, 0);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Orden"
        accent={order.orderNumber}
        description={`Creada ${formatRelativeTime(order.createdAt)} · versión ${order.version}`}
        actions={<><Button asChild variant="outline" size="sm"><Link href="/dashboard/kanban"><ArrowLeft className="size-3.5" /> Tablero</Link></Button>{!editing && <Button size="sm" onClick={beginEdit}>Editar artículos</Button>}<Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="size-3.5" /> Eliminar</Button></>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="grid gap-4">
          <Panel title="Artículos" description={editing ? "Los importes se recalculan con los precios actuales del catálogo." : `${order.items.length} líneas de producto`}>
            {editing ? (
              <form onSubmit={saveItems} className="grid gap-3">
                {draft.map((line, index) => <OrderLineEditor key={`${order.id}-${index}`} line={line} index={index} order={order} products={products} canRemove={draft.length > 1} onChange={(next) => setDraft((current) => current.map((item, itemIndex) => itemIndex === index ? next : item))} onRemove={() => setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}
                {productsQuery.error && <p role="alert" className="text-xs text-danger">No se pudo cargar el catálogo: {messageFrom(productsQuery.error)}</p>}
                <Button type="button" variant="outline" size="sm" className="w-fit" disabled={draft.length >= 100 || products.filter((product) => product.isActive).length === 0} onClick={() => setDraft((current) => [...current, { productId: products.find((product) => product.isActive)?.id ?? "", quantity: 1 }])}><Plus className="size-3.5" /> Agregar producto</Button>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                  <span className="text-sm text-white/45">Total estimado <strong className="ml-2 font-mono text-white">{formatCurrency(estimate)}</strong></span>
                  <div className="flex gap-2"><Button type="button" variant="ghost" onClick={cancelEdit} disabled={saving}>Cancelar</Button><Button type="submit" disabled={saving || productsQuery.isLoading}><Save className="size-3.5" />{saving ? "Guardando…" : "Guardar artículos"}</Button></div>
                </div>
              </form>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-white/35"><tr><th className="py-2 font-medium">Producto</th><th className="py-2 text-right font-medium">Cantidad</th><th className="py-2 text-right font-medium">Precio unitario</th><th className="py-2 text-right font-medium">Importe</th></tr></thead>
                  <tbody className="divide-y divide-white/[0.05]">{order.items.map((line) => <tr key={line.id}><td className="py-3"><div className="font-medium text-white">{line.product.name}</div><div className="mt-0.5 font-mono text-[11px] text-white/40">{line.product.sku}</div></td><td className="py-3 text-right font-mono text-white/70">{line.quantity}</td><td className="py-3 text-right font-mono text-white/70">{formatCurrency(line.unitPrice)}</td><td className="py-3 text-right font-mono text-white">{formatCurrency(line.unitPrice * line.quantity)}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Cliente" description="Datos asociados a esta orden">
            <div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-white/40">Nombre</p><p className="mt-1 text-sm text-white">{order.customer.name}</p></div><div><p className="text-xs text-white/40">Correo</p><p className="mt-1 break-all text-sm text-white">{order.customer.email}</p></div>{order.customer.city && <div><p className="text-xs text-white/40">Ciudad</p><p className="mt-1 text-sm text-white">{order.customer.city}</p></div>}</div>
          </Panel>
        </div>

        <div className="grid content-start gap-4">
          <Panel title="Resumen" description="Estado y métricas de la orden">
            <div className="grid gap-4">
              <span
                className="w-fit rounded-full border px-2.5 py-1 text-xs"
                style={{ borderColor: `${status.color}55`, backgroundColor: `${status.color}18`, color: status.color }}
              >
                {status.label}
              </span>
              <div><p className="text-xs text-white/40">Total</p><p className="mt-1 font-mono text-2xl text-white">{formatCurrency(order.total)}</p></div>
              <div><p className="text-xs text-white/40">Margen bruto</p><p className="mt-1 font-mono text-lg text-white">{formatCurrency(order.margin)} <span className="text-xs text-white/45">({formatPercent(marginRatio(order.margin, order.total))})</span></p></div>
              <div><p className="text-xs text-white/40">Última actualización</p><p className="mt-1 text-sm text-white/75">{new Date(order.updatedAt).toLocaleString("es-MX")}</p></div>
            </div>
          </Panel>
          {editing && <Panel title="Importante" className="border-brand/20"><p className="text-xs leading-relaxed text-white/50">Al guardar, el backend recalcula total y margen con el precio y costo actuales de cada producto. Si la orden cambió en otra sesión, tendrás que recargar y volver a intentar.</p></Panel>}
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-white/10 bg-[#0e0e15] sm:max-w-md">
          <DialogHeader><DialogTitle>Eliminar orden</DialogTitle><DialogDescription>Se eliminará {order.orderNumber} y sus líneas. Esta operación no se puede deshacer.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancelar</Button><Button variant="destructive" onClick={() => void removeOrder()} disabled={deleting}><Trash2 className="size-3.5" />{deleting ? "Eliminando…" : "Eliminar orden"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
