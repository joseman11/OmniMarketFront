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

  it("mantiene el mínimo de una línea y explica el botón deshabilitado con un tooltip", async () => {
    renderOrderDialog({ products: [product] });
    const remove = screen.getByRole("button", { name: "Quitar producto 1" });
    expect((remove as HTMLButtonElement).disabled).toBe(true);
    await userEvent.hover(remove.parentElement as HTMLElement);
    expect((await screen.findByRole("tooltip")).textContent).toContain("Una orden necesita al menos un producto");
  });
});

describe("formulario de producto sin categorías", () => {
  it("crea una categoría inline y la deja seleccionada", async () => {
    const categories: Array<{ id: string; name: string; slug: string }> = [];
    let created: unknown;
    server.use(
      http.get("/backend/categories", () => HttpResponse.json({ items: categories })),
      http.get("/backend/products", () => HttpResponse.json({ items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } })),
      http.post("/backend/categories", async ({ request }) => {
        created = await request.json();
        const item = { id: "c-new", name: "Hogar", slug: "hogar" };
        categories.push(item);
        return HttpResponse.json({ item }, { status: 201 });
      }),
    );
    render(<CatalogManager />, { wrapper });
    await screen.findByText("0 productos en el catálogo");
    await userEvent.click(screen.getByRole("button", { name: "Nuevo producto" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Guardar producto" })).toHaveProperty("disabled", true);
    await userEvent.type(within(dialog).getByLabelText("Categoría"), "Hogar{Enter}");

    await waitFor(() => expect(within(dialog).getByRole("combobox", { name: "Categoría" })).toHaveProperty("value", "c-new"));
    expect(created).toEqual({ name: "Hogar", slug: "hogar" });
    expect(within(dialog).getByRole("button", { name: "Guardar producto" })).toHaveProperty("disabled", false);
  });
});
