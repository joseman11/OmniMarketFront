/**
 * Catálogo de referencia (espejo de Category/Product en schema.prisma).
 * Se usa en el formulario de creación y en el adaptador mock.
 * TODO backend: exponer GET /api/products para no duplicarlo en el cliente.
 */
export type Category = { id: string; name: string; color: string };
export type Product = {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  cost: number;
};

/** Colores categóricos validados (dataviz validator, modo oscuro sobre #0c0c12). */
export const CATEGORIES: Category[] = [
  { id: "cat-electronica", name: "Electrónica", color: "#7c5cff" },
  { id: "cat-hogar", name: "Hogar y Cocina", color: "#d95926" },
  { id: "cat-moda", name: "Moda", color: "#199e70" },
  { id: "cat-belleza", name: "Belleza", color: "#c98500" },
  { id: "cat-deportes", name: "Deportes", color: "#d55181" },
  { id: "cat-libros", name: "Libros", color: "#3987e5" },
];

export const PRODUCTS: Product[] = [
  { id: "p-aud-01", name: "Audífonos inalámbricos ANC", categoryId: "cat-electronica", price: 2499, cost: 1480 },
  { id: "p-smw-02", name: "Smartwatch Fit Pro", categoryId: "cat-electronica", price: 3299, cost: 2150 },
  { id: "p-kbd-03", name: "Teclado mecánico 75%", categoryId: "cat-electronica", price: 1899, cost: 1020 },
  { id: "p-caf-04", name: "Cafetera espresso 15 bar", categoryId: "cat-hogar", price: 4290, cost: 2610 },
  { id: "p-sar-05", name: "Juego de sartenes cerámicos", categoryId: "cat-hogar", price: 1590, cost: 780 },
  { id: "p-lam-06", name: "Lámpara de escritorio LED", categoryId: "cat-hogar", price: 689, cost: 290 },
  { id: "p-ten-07", name: "Tenis urbanos Áurea", categoryId: "cat-moda", price: 1799, cost: 860 },
  { id: "p-chm-08", name: "Chamarra rompevientos", categoryId: "cat-moda", price: 1249, cost: 540 },
  { id: "p-mch-09", name: "Mochila impermeable 25 L", categoryId: "cat-moda", price: 899, cost: 380 },
  { id: "p-ser-10", name: "Sérum vitamina C", categoryId: "cat-belleza", price: 459, cost: 140 },
  { id: "p-ksk-11", name: "Kit skincare nocturno", categoryId: "cat-belleza", price: 1120, cost: 410 },
  { id: "p-yog-12", name: "Tapete de yoga 6 mm", categoryId: "cat-deportes", price: 749, cost: 310 },
  { id: "p-man-13", name: "Mancuernas ajustables 20 kg", categoryId: "cat-deportes", price: 2890, cost: 1790 },
  { id: "p-bot-14", name: "Botella térmica 1 L", categoryId: "cat-deportes", price: 429, cost: 160 },
  { id: "p-nov-15", name: "Novela 'Pedro Páramo' (ed. especial)", categoryId: "cat-libros", price: 349, cost: 170 },
  { id: "p-dis-16", name: "Libro de diseño de sistemas", categoryId: "cat-libros", price: 789, cost: 420 },
];

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function categoryColor(nameOrId: string): string {
  const cat = CATEGORIES.find((c) => c.id === nameOrId || c.name === nameOrId);
  return cat?.color ?? "#7c5cff";
}
