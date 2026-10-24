import { CATEGORIES, PRODUCTS } from "@/lib/catalog";
import { ORDER_STATUSES, type OrderStatus } from "../schemas";

/** Forma "cruda" del backend: los Decimal viajan como string, igual que Prisma. */
export type RawCard = {
  id: string;
  orderNumber: string;
  customerName: string;
  total: string;
  margin: string;
  position: number;
  version: number;
  status: OrderStatus;
  updatedAt: string;
};

export type RawAnalyticsRow = {
  day: string;
  categoryId: string;
  categoryName: string;
  ordersCount: number;
  revenue: string;
  avgTicket: string;
  grossMargin: string;
};

export type MockDb = {
  seededAt: string;
  nextOrderSeq: number;
  cards: RawCard[];
  analytics: RawAnalyticsRow[];
};

/** PRNG determinista (mulberry32) para que el reset produzca siempre el mismo set. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CUSTOMERS = [
  "Valeria Hernández", "Diego Ramírez", "Sofía Martínez", "Emiliano García",
  "Regina López", "Santiago Torres", "Ximena Flores", "Mateo Sánchez",
  "Camila Rivera", "Leonardo Cruz", "Renata Morales", "Sebastián Ortiz",
  "Mariana Gutiérrez", "Iker Castillo", "Fernanda Vargas", "Andrés Mendoza",
  "Daniela Reyes", "Rodrigo Jiménez", "Paola Aguilar", "Joaquín Navarro",
];

const CATEGORY_PROFILE: Record<string, { base: number; ticket: number; margin: number }> = {
  "cat-electronica": { base: 26, ticket: 2450, margin: 0.36 },
  "cat-hogar": { base: 18, ticket: 1680, margin: 0.44 },
  "cat-moda": { base: 22, ticket: 1180, margin: 0.53 },
  "cat-belleza": { base: 15, ticket: 760, margin: 0.66 },
  "cat-deportes": { base: 12, ticket: 1290, margin: 0.42 },
  "cat-libros": { base: 9, ticket: 520, margin: 0.47 },
};

const toIsoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const SEED_DAYS = 60;

export function createSeed(now = new Date()): MockDb {
  const rand = rng(20261023);

  // Analítica diaria por categoría (SalesDailyMetric)
  const analytics: RawAnalyticsRow[] = [];
  for (let i = SEED_DAYS - 1; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const weekday = day.getDay();
    const weekend = weekday === 0 || weekday === 6 ? 1.22 : 1;
    const trend = 1 + (SEED_DAYS - i) / SEED_DAYS / 3;
    for (const cat of CATEGORIES) {
      const p = CATEGORY_PROFILE[cat.id]!;
      const orders = Math.max(1, Math.round(p.base * weekend * trend * (0.7 + rand() * 0.6)));
      const ticket = p.ticket * (0.88 + rand() * 0.24);
      const revenue = orders * ticket;
      const margin = revenue * (p.margin + (rand() - 0.5) * 0.08);
      analytics.push({
        day: toIsoDay(day),
        categoryId: cat.id,
        categoryName: cat.name,
        ordersCount: orders,
        revenue: revenue.toFixed(2),
        avgTicket: (revenue / orders).toFixed(2),
        grossMargin: margin.toFixed(2),
      });
    }
  }

  // Órdenes para el Kanban
  const distribution: Record<OrderStatus, number> = {
    PENDING: 9,
    PROCESSING: 7,
    SHIPPED: 6,
    DELIVERED: 8,
    CANCELLED: 3,
  };
  const cards: RawCard[] = [];
  let seq = 1040;
  for (const status of ORDER_STATUSES) {
    for (let pos = 0; pos < distribution[status]; pos++) {
      const lines = 1 + Math.floor(rand() * 3);
      let total = 0;
      let cost = 0;
      for (let l = 0; l < lines; l++) {
        const product = PRODUCTS[Math.floor(rand() * PRODUCTS.length)]!;
        const qty = 1 + Math.floor(rand() * 3);
        total += product.price * qty;
        cost += product.cost * qty;
      }
      seq += 1;
      cards.push({
        id: `ord_${seq.toString(36)}${Math.floor(rand() * 1e6).toString(36)}`,
        orderNumber: `OM-${seq}`,
        customerName: CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)]!,
        total: total.toFixed(2),
        margin: (total - cost).toFixed(2),
        position: pos,
        version: 1,
        status,
        updatedAt: new Date(now.getTime() - Math.floor(rand() * 72 * 3600 * 1000)).toISOString(),
      });
    }
  }

  return { seededAt: now.toISOString(), nextOrderSeq: seq + 1, cards, analytics };
}
