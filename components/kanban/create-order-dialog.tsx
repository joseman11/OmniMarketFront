"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createOrderInputSchema,
  type ApiProduct,
  type CreateOrderFormValues,
  type CreateOrderInput,
} from "@/lib/api/schemas";
import { orderTotal } from "@/lib/finance";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const DEFAULTS: CreateOrderFormValues = {
  customerName: "",
  customerEmail: "",
  items: [{ productId: "", quantity: 1 }],
};

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs text-danger">
      {message}
    </p>
  );
}

export function CreateOrderDialog({
  open,
  onOpenChange,
  onCreate,
  products,
  productsLoading,
  onCloseAutoFocus,
}: {
  open: boolean;
  /** Retorno de foco al cerrar (el diálogo se abre por estado, no por DialogTrigger). */
  onCloseAutoFocus?: (event: Event) => void;
  onOpenChange: (open: boolean) => void;
  products: ApiProduct[];
  productsLoading: boolean;
  /** Debe lanzar si el servidor falla (el diálogo se mantiene abierto). */
  onCreate: (input: CreateOrderInput) => Promise<void>;
}) {
  const form = useForm<CreateOrderFormValues, unknown, CreateOrderInput>({
    resolver: zodResolver(createOrderInputSchema),
    defaultValues: DEFAULTS,
    mode: "onTouched",
  });
  const { register, control, handleSubmit, formState, reset } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" });
  const priceById = useMemo(() => new Map(products.map((product) => [product.id, product.price])), [products]);
  const estimated = orderTotal(
    (items ?? []).map((i) => ({
      quantity: Number(i?.quantity) || 0,
      unitPrice: priceById.get(i?.productId ?? "") ?? 0,
    })),
  );
  // Agrupar el catálogo sólo con el diálogo abierto y una vez por catálogo (no al cambiar cantidades).
  const productGroups = useMemo(
    () =>
      open
        ? Array.from(
            products.reduce((groups, product) => {
              const group = groups.get(product.category.name) ?? [];
              group.push(product);
              groups.set(product.category.name, group);
              return groups;
            }, new Map<string, ApiProduct[]>()),
          )
        : [],
    [open, products],
  );

  const submit = handleSubmit(async (values) => {
    try {
      await onCreate(values);
      reset(DEFAULTS);
    } catch {
      /* el toast lo emite el tablero; se conserva lo capturado */
    }
  });

  const errors = formState.errors;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (formState.isSubmitting) return;
        onOpenChange(o);
        if (!o) reset(DEFAULTS);
      }}
    >
      <DialogContent onCloseAutoFocus={onCloseAutoFocus} className="max-h-[90svh] overflow-y-auto border-white/10 bg-[#0e0e15] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva orden</DialogTitle>
          <DialogDescription>Los datos se validan con Zod antes de enviarse al servidor.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="grid gap-5" aria-label="Crear orden">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="customerName">Cliente</Label>
              <Input
                id="customerName"
                placeholder="Nombre completo"
                autoComplete="off"
                aria-invalid={!!errors.customerName}
                aria-describedby={errors.customerName ? "customerName-error" : undefined}
                {...register("customerName")}
              />
              <FieldError id="customerName-error" message={errors.customerName?.message} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="customerEmail">
                Correo
              </Label>
              <Input
                id="customerEmail"
                type="email"
                required
                placeholder="cliente@correo.mx"
                aria-invalid={!!errors.customerEmail}
                aria-describedby={errors.customerEmail ? "customerEmail-error" : undefined}
                {...register("customerEmail")}
              />
              <FieldError id="customerEmail-error" message={errors.customerEmail?.message} />
            </div>
          </div>

          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-medium">Productos</legend>
            {fields.map((field, index) => {
              const err = errors.items?.[index];
              return (
                <div key={field.id} className="grid grid-cols-[1fr_88px_36px] items-start gap-2">
                  <div className="grid gap-1.5">
                    <Controller
                      control={control}
                      name={`items.${index}.productId`}
                      render={({ field: f }) => (
                        <Select value={f.value} onValueChange={f.onChange}>
                            <SelectTrigger
                              ref={f.ref}
                              aria-label={`Producto ${index + 1}`}
                              aria-invalid={!!err?.productId}
                              aria-describedby={err?.productId ? `items-${index}-product-error` : undefined}
                              onBlur={f.onBlur}
                              disabled={productsLoading || products.length === 0}
                              className="w-full"
                          >
                            <SelectValue placeholder="Selecciona un producto" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {productGroups.map(([categoryName, categoryProducts]) => (
                              <div key={categoryName}>
                                <div className="px-2 pt-2 pb-1 text-[10px] tracking-wider text-subtle uppercase">{categoryName}</div>
                                {categoryProducts.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name} · {formatCurrency(p.price)}
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
            <FieldError id={`items-${index}-product-error`} message={err?.productId?.message} />
                  </div>
                  <div className="grid gap-1.5">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={99}
                      aria-label={`Cantidad ${index + 1}`}
                      aria-invalid={!!err?.quantity}
                      aria-describedby={err?.quantity ? `items-${index}-qty-error` : undefined}
                      {...register(`items.${index}.quantity`)}
                    />
                    <FieldError id={`items-${index}-qty-error`} message={err?.quantity?.message} />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Quitar producto ${index + 1}`}
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                    className="mt-0.5"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
            <FieldError id="items-error" message={errors.items?.root?.message ?? errors.items?.message} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              disabled={fields.length >= 10}
              onClick={() => append({ productId: "", quantity: 1 })}
            >
              <Plus className="size-3.5" /> Agregar producto
            </Button>
            {products.length === 0 && !productsLoading && (
              <p className="text-xs text-subtle">El catálogo del backend no tiene productos activos para crear órdenes.</p>
            )}
            {productsLoading && <p className="text-xs text-subtle">Cargando catálogo…</p>}
          </fieldset>

          <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <span className="text-sm text-white/55">Total estimado</span>
            <span className={cn("font-mono text-lg text-white tabular", estimated === 0 && "text-subtle")}>
              {formatCurrency(estimated)}
            </span>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={formState.isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" data-testid="order-form-submit" disabled={formState.isSubmitting} className="min-w-32">
              {formState.isSubmitting ? "Guardando…" : "Crear orden"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
