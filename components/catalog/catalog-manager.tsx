"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Box, Pencil, Plus, RefreshCw, Search, Tags, Trash2 } from "lucide-react";
import { PageHeader, Panel, ErrorState } from "@/components/dashboard/panel";
import { useDashboardAccess } from "@/components/dashboard/access-context";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories, useProductDetail, useProducts } from "@/lib/hooks/use-api";
import { useReturnFocus } from "@/lib/hooks/use-return-focus";
import { ApiError, api } from "@/lib/api/client";
import { categoryInputSchema, productInputSchema, type ApiCategory, type ApiProduct } from "@/lib/api/schemas";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "products" | "categories";
type DeleteTarget = { kind: Tab; id: string; label: string };
type CategoryForm = { name: string; slug: string };
type ProductForm = {
  categoryId: string;
  sku: string;
  name: string;
  price: string;
  cost: string;
  stock: string;
  isActive: boolean;
};

const EMPTY_CATEGORY: CategoryForm = { name: "", slug: "" };
const EMPTY_PRODUCT: ProductForm = { categoryId: "", sku: "", name: "", price: "", cost: "", stock: "0", isActive: true };
const NO_CATEGORIES: ApiCategory[] = [];
const NO_PRODUCTS: ApiProduct[] = [];

function slugFrom(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function messageFrom(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5"><Label>{label}</Label>{children}</label>;
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <Field label={label}>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function CatalogManager() {
  const { canManageCatalog } = useDashboardAccess();
  const { mutate: refreshGlobal } = useSWRConfig();
  const categoriesQuery = useCategories();
  const productsQuery = useProducts(true);
  const categories = categoriesQuery.data?.data.items ?? NO_CATEGORIES;
  const products = productsQuery.data?.data.items ?? NO_PRODUCTS;

  const [tab, setTab] = useState<Tab>("products");
  const [search, setSearch] = useState("");
  // Cada operación tiene su propio estado pendiente.
  const [categoryPending, setCategoryPending] = useState(false);
  const [productPending, setProductPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const pending = categoryPending || productPending || deletePending;
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(EMPTY_CATEGORY);
  const [categoryError, setCategoryError] = useState("");
  const [productOpen, setProductOpen] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(EMPTY_PRODUCT);
  const [productError, setProductError] = useState("");
  const [productLoading, setProductLoading] = useState(false);
  // Época del formulario de producto: cambia al abrir/cerrar. Una respuesta tardía
  // (getProduct o guardado) de una época anterior no toca el formulario vigente.
  const productRequest = useRef(0);
  const categoryRequest = useRef(0);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const detail = useProductDetail(detailProductId);
  const productDetail = detail.data ?? null;
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Retorno de foco al invocador; si su fila desapareció (p. ej. tras eliminar), a la búsqueda.
  const searchRef = useRef<HTMLInputElement>(null);
  const categoryReturnFocus = useReturnFocus(categoryOpen, searchRef);
  const productReturnFocus = useReturnFocus(productOpen, searchRef);
  const detailReturnFocus = useReturnFocus(detailProductId !== null, searchRef);
  const deletedRef = useRef(false);
  const deleteReturnFocus = useReturnFocus(deleteTarget !== null, searchRef, deletedRef);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => `${product.name} ${product.sku} ${product.category.name}`.toLowerCase().includes(query));
  }, [products, search]);
  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) => `${category.name} ${category.slug}`.toLowerCase().includes(query));
  }, [categories, search]);

  const refresh = async () => {
    await Promise.all([categoriesQuery.mutate(), productsQuery.mutate()]);
  };

  const openCategoryForm = (category?: ApiCategory) => {
    categoryRequest.current++;
    setCategoryId(category?.id ?? null);
    setCategoryForm(category ? { name: category.name, slug: category.slug } : EMPTY_CATEGORY);
    setCategoryError("");
    setCategoryOpen(true);
  };

  const saveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = categoryInputSchema.safeParse(categoryForm);
    if (!parsed.success) {
      setCategoryError(parsed.error.issues[0]?.message ?? "Revisa los datos de la categoría.");
      return;
    }
    if (categoryPending) return;
    const request = categoryRequest.current;
    setCategoryPending(true);
    setCategoryError("");
    try {
      if (categoryId) await api.updateCategory(categoryId, parsed.data);
      else await api.createCategory(parsed.data);
      if (request === categoryRequest.current) setCategoryOpen(false);
      await refreshGlobal((key) => key === "categories" || (Array.isArray(key) && key[0] === "products"));
      toast.success(categoryId ? "Categoría actualizada" : "Categoría creada");
    } catch (error) {
      if (request === categoryRequest.current) setCategoryError(messageFrom(error));
    } finally {
      setCategoryPending(false);
    }
  };

  const openProductForm = async (product?: ApiProduct) => {
    const request = ++productRequest.current;
    setProductError("");
    setProductId(product?.id ?? null);
    setProductForm(product ? {
      categoryId: product.categoryId,
      sku: product.sku,
      name: product.name,
      price: product.price.toFixed(2),
      cost: product.cost.toFixed(2),
      stock: String(product.stock),
      isActive: product.isActive,
    } : { ...EMPTY_PRODUCT, categoryId: categories[0]?.id ?? "" });
    setProductOpen(true);
    if (!product) {
      setProductLoading(false);
      return;
    }

    // Los campos quedan deshabilitados mientras llega la versión fresca, así no se pierde lo que se escriba.
    setProductLoading(true);
    try {
      const result = await api.getProduct(product.id);
      if (request !== productRequest.current) return;
      const fresh = result.data.item;
      setProductForm({
        categoryId: fresh.categoryId,
        sku: fresh.sku,
        name: fresh.name,
        price: fresh.price.toFixed(2),
        cost: fresh.cost.toFixed(2),
        stock: String(fresh.stock),
        isActive: fresh.isActive,
      });
    } catch (error) {
      if (request !== productRequest.current) return;
      setProductOpen(false);
      toast.error("No se pudo cargar el producto", { description: messageFrom(error) });
    } finally {
      if (request === productRequest.current) setProductLoading(false);
    }
  };

  /** Cancelar, X y Escape pasan por aquí: invalidan la época y no cierran mientras se guarda. */
  const setProductDialogOpen = (open: boolean) => {
    if (!open && productPending) return;
    if (!open) productRequest.current++;
    setProductOpen(open);
  };
  const setCategoryDialogOpen = (open: boolean) => {
    if (!open && categoryPending) return;
    if (!open) categoryRequest.current++;
    setCategoryOpen(open);
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = productInputSchema.safeParse({ ...productForm, stock: Number(productForm.stock) });
    if (!parsed.success) {
      setProductError(parsed.error.issues[0]?.message ?? "Revisa los datos del producto.");
      return;
    }
    if (productPending) return;
    const request = productRequest.current;
    setProductPending(true);
    setProductError("");
    try {
      if (productId) await api.updateProduct(productId, parsed.data);
      else await api.createProduct(parsed.data);
      if (request === productRequest.current) setProductOpen(false);
      await refreshGlobal((key) => Array.isArray(key) && (key[0] === "products" || key[0] === "product-detail"));
      toast.success(productId ? "Producto actualizado" : "Producto creado");
    } catch (error) {
      if (request === productRequest.current) setProductError(messageFrom(error));
    } finally {
      setProductPending(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deletePending) return;
    setDeletePending(true);
    try {
      if (deleteTarget.kind === "categories") await api.deleteCategory(deleteTarget.id);
      else await api.deleteProduct(deleteTarget.id);
      deletedRef.current = true; // la fila que abrió el diálogo va a desaparecer
      setDeleteTarget(null);
      await refreshGlobal((key) => key === "categories" || (Array.isArray(key) && key[0] === "products"));
      toast.success(deleteTarget.kind === "categories" ? "Categoría eliminada" : "Producto eliminado");
    } catch (error) {
      toast.error("No se pudo eliminar", { description: messageFrom(error) });
    } finally {
      setDeletePending(false);
    }
  };

  const selectedRowsLoading = tab === "products"
    ? productsQuery.isLoading
    : categoriesQuery.isLoading;
  const selectedRowsError = tab === "products" ? productsQuery.error : categoriesQuery.error;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Catálogo"
        accent="de productos"
        description="Administra los productos y categorías que alimentan las órdenes y la analítica."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={pending}>
              <RefreshCw className="size-3.5" /> Actualizar
            </Button>
            {canManageCatalog && (
              <Button size="sm" onClick={() => tab === "products" ? void openProductForm() : openCategoryForm()}>
                <Plus className="size-3.5" /> {tab === "products" ? "Nuevo producto" : "Nueva categoría"}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <Panel title="Catálogo" description={canManageCatalog ? "Gestión de inventario" : "Consulta de inventario"} className="h-fit">
          <div className="grid gap-2" role="tablist" aria-label="Secciones del catálogo">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "products"}
              onClick={() => { setTab("products"); setSearch(""); }}
              className={cn("flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition", tab === "products" ? "border-brand/35 bg-brand/10 text-white" : "border-white/[0.07] text-white/55 hover:bg-white/[0.04] hover:text-white")}
            >
              <span className="flex items-center gap-2"><Box className="size-4" /> Productos</span>
              <span className="font-mono text-xs text-white/40">{products.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "categories"}
              onClick={() => { setTab("categories"); setSearch(""); }}
              className={cn("flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition", tab === "categories" ? "border-brand/35 bg-brand/10 text-white" : "border-white/[0.07] text-white/55 hover:bg-white/[0.04] hover:text-white")}
            >
              <span className="flex items-center gap-2"><Tags className="size-4" /> Categorías</span>
              <span className="font-mono text-xs text-white/40">{categories.length}</span>
            </button>
          </div>
          {!canManageCatalog && <p className="mt-4 text-xs leading-relaxed text-white/40">Esta cuenta solo puede consultar el catálogo.</p>}
        </Panel>

        <Panel
          title={tab === "products" ? "Productos" : "Categorías"}
          description={tab === "products" ? `${filteredProducts.length} productos en el catálogo` : `${filteredCategories.length} categorías disponibles`}
          action={
            <label className="relative block w-52 max-w-[55vw]">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-white/35" />
              <Input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar…" className="h-8 pl-8 text-xs" aria-label="Buscar en el catálogo" />
            </label>
          }
          className="min-w-0 p-0 md:p-0 [&>header]:px-5 [&>header]:pt-5 md:[&>header]:px-6 md:[&>header]:pt-6"
        >
          {selectedRowsError ? (
            <div className="p-5"><ErrorState message={messageFrom(selectedRowsError)} onRetry={() => void refresh()} /></div>
          ) : selectedRowsLoading ? (
            <div className="space-y-3 p-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-11 w-full" />)}</div>
          ) : tab === "products" ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-y border-white/[0.06] bg-white/[0.02] text-[11px] uppercase tracking-wider text-white/35">
                  <tr><th className="px-5 py-3 font-medium">Producto</th><th className="px-4 py-3 font-medium">Categoría</th><th className="px-4 py-3 font-medium">Precio / costo</th><th className="px-4 py-3 font-medium">Existencia</th><th className="px-4 py-3 font-medium">Estado</th><th className="px-5 py-3 text-right font-medium">Acciones</th></tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="transition hover:bg-white/[0.025]">
                      <td className="px-5 py-3"><div className="font-medium text-white">{product.name}</div><div className="mt-0.5 font-mono text-[11px] text-white/40">{product.sku}</div></td>
                      <td className="px-4 py-3 text-white/60">{product.category.name}</td>
                      <td className="px-4 py-3"><div className="font-mono text-white">{formatCurrency(product.price)}</div><div className="font-mono text-[11px] text-white/35">Costo {formatCurrency(product.cost)}</div></td>
                      <td className="px-4 py-3 font-mono text-white/70">{product.stock}</td>
                      <td className="px-4 py-3"><span className={cn("rounded-full border px-2 py-1 text-[10px]", product.isActive ? "border-success/25 bg-success/10 text-success" : "border-white/10 bg-white/[0.03] text-white/40")}>{product.isActive ? "Activo" : "Inactivo"}</span></td>
                      <td className="px-5 py-3"><div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setDetailProductId(product.id)}>Ver</Button>
                        {canManageCatalog && <Button variant="ghost" size="icon-sm" aria-label={`Editar ${product.name}`} onClick={() => void openProductForm(product)}><Pencil className="size-3.5" /></Button>}
                        {canManageCatalog && <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${product.name}`} onClick={() => setDeleteTarget({ kind: "products", id: product.id, label: product.name })}><Trash2 className="size-3.5 text-danger" /></Button>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProducts.length === 0 && <p className="p-8 text-center text-sm text-white/40">No hay productos que coincidan con la búsqueda.</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px] text-left text-sm">
                <thead className="border-y border-white/[0.06] bg-white/[0.02] text-[11px] uppercase tracking-wider text-white/35"><tr><th className="px-5 py-3 font-medium">Nombre</th><th className="px-4 py-3 font-medium">Slug</th><th className="px-4 py-3 font-medium">Productos</th><th className="px-5 py-3 text-right font-medium">Acciones</th></tr></thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredCategories.map((category) => {
                    const count = products.filter((product) => product.categoryId === category.id).length;
                    return <tr key={category.id} className="transition hover:bg-white/[0.025]"><td className="px-5 py-3 font-medium text-white">{category.name}</td><td className="px-4 py-3 font-mono text-xs text-white/45">{category.slug}</td><td className="px-4 py-3 font-mono text-white/60">{count}</td><td className="px-5 py-3"><div className="flex justify-end gap-1">{canManageCatalog && <Button variant="ghost" size="icon-sm" aria-label={`Editar ${category.name}`} onClick={() => openCategoryForm(category)}><Pencil className="size-3.5" /></Button>}{canManageCatalog && <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${category.name}`} onClick={() => setDeleteTarget({ kind: "categories", id: category.id, label: category.name })}><Trash2 className="size-3.5 text-danger" /></Button>}</div></td></tr>;
                  })}
                </tbody>
              </table>
              {filteredCategories.length === 0 && <p className="p-8 text-center text-sm text-white/40">No hay categorías que coincidan con la búsqueda.</p>}
            </div>
          )}
        </Panel>
      </div>

      <Dialog open={categoryOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent onCloseAutoFocus={categoryReturnFocus} className="border-white/10 bg-[#0e0e15] sm:max-w-md">
          <DialogHeader><DialogTitle>{categoryId ? "Editar categoría" : "Nueva categoría"}</DialogTitle><DialogDescription>El slug se usa en reportes y se genera a partir del nombre.</DialogDescription></DialogHeader>
          <form onSubmit={saveCategory} className="grid gap-4">
            <TextField label="Nombre" value={categoryForm.name} onChange={(name) => setCategoryForm((form) => ({ ...form, name, slug: slugFrom(name) }))} placeholder="Ej. Hogar" />
            <TextField label="Slug" value={categoryForm.slug} onChange={(slug) => setCategoryForm((form) => ({ ...form, slug }))} placeholder="hogar" />
            {categoryError && <p role="alert" className="text-sm text-danger">{categoryError}</p>}
            <DialogFooter><Button type="button" variant="ghost" onClick={() => setCategoryDialogOpen(false)} disabled={categoryPending}>Cancelar</Button><Button type="submit" disabled={categoryPending}>{categoryPending ? "Guardando…" : "Guardar categoría"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={productOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent onCloseAutoFocus={productReturnFocus} className="max-h-[90svh] overflow-y-auto border-white/10 bg-[#0e0e15] sm:max-w-xl">
          <DialogHeader><DialogTitle>{productId ? "Editar producto" : "Nuevo producto"}</DialogTitle><DialogDescription>Los pedidos guardan el precio y costo vigentes al momento de crearse.</DialogDescription></DialogHeader>
          <form onSubmit={saveProduct} className="grid gap-4">
            <fieldset disabled={productLoading} aria-busy={productLoading} className="grid min-w-0 gap-4 disabled:opacity-60 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label="Categoría"><select value={productForm.categoryId} onChange={(event) => setProductForm((form) => ({ ...form, categoryId: event.target.value }))} className="h-9 w-full rounded-lg border border-white/10 bg-[#15151e] px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-brand" required><option value="">Selecciona una categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field></div>
            <TextField label="Nombre" value={productForm.name} onChange={(name) => setProductForm((form) => ({ ...form, name }))} placeholder="Producto" />
            <TextField label="SKU" value={productForm.sku} onChange={(sku) => setProductForm((form) => ({ ...form, sku }))} placeholder="SKU-001" />
            <TextField label="Precio" type="number" min={0} step="0.01" value={productForm.price} onChange={(price) => setProductForm((form) => ({ ...form, price }))} placeholder="0.00" />
            <TextField label="Costo" type="number" min={0} step="0.01" value={productForm.cost} onChange={(cost) => setProductForm((form) => ({ ...form, cost }))} placeholder="0.00" />
            <TextField label="Existencia" type="number" min={0} max={2_000_000} step="1" value={productForm.stock} onChange={(stock) => setProductForm((form) => ({ ...form, stock }))} />
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-white/70"><input type="checkbox" checked={productForm.isActive} onChange={(event) => setProductForm((form) => ({ ...form, isActive: event.target.checked }))} className="size-4 accent-[#7c5cff]" /> Disponible para pedidos</label>
            </fieldset>
            {productError && <p role="alert" className="text-sm text-danger">{productError}</p>}
            <DialogFooter><Button type="button" variant="ghost" onClick={() => setProductDialogOpen(false)} disabled={productPending}>Cancelar</Button><Button type="submit" disabled={productPending || productLoading || categories.length === 0}>{productPending ? "Guardando…" : productLoading ? "Cargando…" : "Guardar producto"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailProductId !== null} onOpenChange={(open) => !open && setDetailProductId(null)}>
        <DialogContent onCloseAutoFocus={detailReturnFocus} className="border-white/10 bg-[#0e0e15] sm:max-w-md">
          <DialogHeader><DialogTitle>Detalle del producto</DialogTitle><DialogDescription>Consulta directa del registro en el backend.</DialogDescription></DialogHeader>
          {detail.error && !productDetail ? <ErrorState message={`No se pudo consultar el producto: ${messageFrom(detail.error)}`} onRetry={() => void detail.mutate()} /> : detail.isLoading || !productDetail ? <Skeleton className="h-32 w-full" /> : productDetail ? <div className="grid grid-cols-2 gap-3 text-sm"><div className="text-white/40">Nombre</div><div className="text-right text-white">{productDetail.name}</div><div className="text-white/40">SKU</div><div className="text-right font-mono text-white">{productDetail.sku}</div><div className="text-white/40">Categoría</div><div className="text-right text-white">{productDetail.category.name}</div><div className="text-white/40">Precio</div><div className="text-right font-mono text-white">{formatCurrency(productDetail.price)}</div><div className="text-white/40">Costo</div><div className="text-right font-mono text-white">{formatCurrency(productDetail.cost)}</div><div className="text-white/40">Existencia</div><div className="text-right font-mono text-white">{productDetail.stock}</div></div> : null}
          <DialogFooter>{canManageCatalog && productDetail && <Button variant="outline" onClick={() => { setDetailProductId(null); void openProductForm(productDetail); }}><Pencil className="size-3.5" /> Editar</Button>}<Button variant="ghost" onClick={() => setDetailProductId(null)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && !deletePending && setDeleteTarget(null)}>
        <DialogContent onCloseAutoFocus={deleteReturnFocus} className="border-white/10 bg-[#0e0e15] sm:max-w-md">
          <DialogHeader><DialogTitle>Confirmar eliminación</DialogTitle><DialogDescription>Se eliminará “{deleteTarget?.label}”. La operación puede rechazarse si el registro tiene relaciones activas.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deletePending}>Cancelar</Button><Button variant="destructive" onClick={() => void confirmDelete()} disabled={deletePending}>{deletePending ? "Eliminando…" : "Eliminar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
