import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { describe, expect, it, vi } from "vitest";
import { CatalogManager } from "@/components/catalog/catalog-manager";
import { DashboardAccessProvider } from "@/components/dashboard/access-context";
import { NEW_PRODUCT_HREF } from "@/components/dashboard/nav";
import { CreateOrderDialog } from "@/components/kanban/create-order-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ApiProduct } from "@/lib/api/schemas";
import { server } from "./setup";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/dashboard/catalog",
  useSearchParams: () => new URLSearchParams(),
}));

// Radix Popper (tooltip) mide con ResizeObserver, que jsdom no implementa.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
    <TooltipProvider delayDuration={0}>
      <DashboardAccessProvider canManageCatalog>{children}</DashboardAccessProvider>
    </TooltipProvider>
  </SWRConfig>
);

const product = {
  id: "p1",
  categoryId: "c1",
  sku: "TAZA",
  name: "Taza",
  price: 120,
  cost: 45,
  stock: 10,
  isActive: true,
  category: { id: "c1", name: "Hogar", slug: "hogar" },
} as unknown as ApiProduct;

function renderOrderDialog(props: Partial<Parameters<typeof CreateOrderDialog>[0]> = {}) {
  return render(
    <CreateOrderDialog open onOpenChange={() => undefined} onCreate={async () => undefined} products={[]} productsLoading={false} {...props} />,
    { wrapper },
  );
}

describe("alta de orden sin catálogo", () => {
  it("muestra un estado vacío con «Crear producto» en lugar del formulario", () => {
    renderOrderDialog();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Aún no tienes productos activos")).toBeTruthy();
    expect(within(dialog).getByRole("link", { name: /Crear producto/ }).getAttribute("href")).toBe(NEW_PRODUCT_HREF);
    expect(within(dialog).queryByRole("form", { name: "Crear orden" })).toBeNull();
  });

  it("un error de carga no se presenta como catálogo vacío", () => {
    renderOrderDialog({ productsError: true });
    expect(screen.queryByText("Aún no tienes productos activos")).toBeNull();
    expect(screen.getByRole("alert").textContent).toContain("No se pudo cargar el catálogo");
  });

  it("permite quitar la única línea vacía y volver a agregarla", async () => {
    const user = userEvent.setup();
    renderOrderDialog({ products: [product] });
    const remove = screen.getByRole("button", { name: "Quitar producto 1" });
    expect((remove as HTMLButtonElement).disabled).toBe(false);
    await user.click(remove);
    expect(screen.queryByRole("combobox", { name: "Producto 1" })).toBeNull();
    expect(screen.getByText("Agrega al menos un producto para continuar.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Agregar producto" }));
    expect(screen.getByRole("combobox", { name: "Producto 1" })).toBeTruthy();
  });

  it("mantiene protegida la única línea después de elegir un producto", async () => {
    const user = userEvent.setup();
    renderOrderDialog({ products: [product] });
    await user.click(screen.getByRole("combobox", { name: "Producto 1" }));
    await user.click(await screen.findByRole("option", { name: /Taza/ }));

    const remove = screen.getByRole("button", { name: "Quitar producto 1" });
    expect((remove as HTMLButtonElement).disabled).toBe(true);
    await user.hover(remove.parentElement as HTMLElement);
    expect((await screen.findByRole("tooltip")).textContent).toContain("Una orden necesita al menos un producto");
  });
});

describe("formulario de producto sin categorías", () => {
  it("crea una categoría inline y guarda un producto en ella", async () => {
    const categories: Array<{ id: string; name: string; slug: string }> = [];
    const newCategoryId = "00000000-0000-4000-8000-000000000001";
    const products: ApiProduct[] = [];
    let createdCategory: unknown;
    let createdProduct: unknown;
    server.use(
      http.get("/backend/categories", () => HttpResponse.json({ items: categories })),
      http.get("/backend/products", () => HttpResponse.json({ items: products, pagination: { page: 1, limit: 100, total: products.length, totalPages: products.length ? 1 : 0 } })),
      http.post("/backend/categories", async ({ request }) => {
        createdCategory = await request.json();
        const item = { id: newCategoryId, name: "Hogar", slug: "hogar" };
        categories.push(item);
        return HttpResponse.json({ item }, { status: 201 });
      }),
      http.post("/backend/products", async ({ request }) => {
        const input = await request.json() as {
          categoryId: string;
          sku: string;
          name: string;
          price: string;
          cost: string;
          stock: number;
          isActive: boolean;
        };
        createdProduct = input;
        const item: ApiProduct = {
          ...product,
          id: "p-new",
          categoryId: input.categoryId,
          category: categories.find((category) => category.id === input.categoryId)!,
          sku: input.sku,
          name: input.name,
          price: Number(input.price),
          cost: Number(input.cost),
          stock: input.stock,
          isActive: input.isActive,
        };
        products.push(item);
        return HttpResponse.json({ item }, { status: 201 });
      }),
    );
    render(<CatalogManager />, { wrapper });
    await screen.findByText("0 productos en el catálogo");
    await userEvent.click(screen.getByRole("button", { name: "Nuevo producto" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Guardar producto" })).toHaveProperty("disabled", true);
    await userEvent.type(within(dialog).getByLabelText("Categoría"), "Hogar{Enter}");

    await waitFor(() => expect(within(dialog).getByRole("combobox", { name: "Categoría" })).toHaveProperty("value", newCategoryId));
    expect(createdCategory).toEqual({ name: "Hogar", slug: "hogar" });
    expect(within(dialog).getByRole("button", { name: "Guardar producto" })).toHaveProperty("disabled", false);

    await userEvent.type(within(dialog).getByLabelText("Nombre"), "Producto de prueba");
    await userEvent.type(within(dialog).getByLabelText("SKU"), "PRODUCTO-PRUEBA");
    await userEvent.type(within(dialog).getByLabelText("Precio"), "120.00");
    await userEvent.type(within(dialog).getByLabelText("Costo"), "45.00");
    await userEvent.type(within(dialog).getByLabelText("Existencia"), "8");
    await userEvent.click(within(dialog).getByRole("button", { name: "Guardar producto" }));

    await waitFor(() => expect(createdProduct).toEqual(expect.objectContaining({
      categoryId: newCategoryId,
      sku: "PRODUCTO-PRUEBA",
      name: "Producto de prueba",
      price: "120.00",
      cost: "45.00",
      stock: 8,
      isActive: true,
    })));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
