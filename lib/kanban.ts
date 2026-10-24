import { ORDER_STATUSES, type KanbanBoard, type KanbanCard, type OrderStatus } from "@/lib/api/schemas";

export type BoardState = Record<OrderStatus, KanbanCard[]>;

export function emptyBoard(): BoardState {
  return { PENDING: [], PROCESSING: [], SHIPPED: [], DELIVERED: [], CANCELLED: [] };
}

/** Respuesta del backend → estado local (ordenado por position). */
export function toBoardState(board: KanbanBoard): BoardState {
  const state = emptyBoard();
  for (const col of board.columns) {
    state[col.status] = [...col.cards].sort((a, b) => a.position - b.position);
  }
  return state;
}

/** Estado local → forma del backend (para escribir en la caché de SWR). */
export function toKanbanBoard(state: BoardState): KanbanBoard {
  return {
    columns: ORDER_STATUSES.map((status) => ({
      status,
      count: state[status].length,
      cards: state[status].map((c, i) => ({ ...c, status, position: i })),
    })),
  };
}

export function isStatus(id: unknown): id is OrderStatus {
  return typeof id === "string" && (ORDER_STATUSES as readonly string[]).includes(id);
}

/** Columna que contiene el id (de tarjeta o de columna). */
export function findContainer(state: BoardState, id: string): OrderStatus | null {
  if (isStatus(id)) return id;
  for (const s of ORDER_STATUSES) {
    if (state[s].some((c) => c.id === id)) return s;
  }
  return null;
}

export function locate(state: BoardState, id: string): { status: OrderStatus; index: number } | null {
  for (const s of ORDER_STATUSES) {
    const index = state[s].findIndex((c) => c.id === id);
    if (index !== -1) return { status: s, index };
  }
  return null;
}

/** Mueve una tarjeta (inmutable) a `toStatus` en `toIndex` (se acota al rango válido). */
export function moveCard(state: BoardState, id: string, toStatus: OrderStatus, toIndex: number): BoardState {
  const from = locate(state, id);
  if (!from) return state;
  const card = state[from.status][from.index]!;
  const next: BoardState = { ...state, [from.status]: state[from.status].filter((c) => c.id !== id) };
  const target = [...next[toStatus]];
  const idx = Math.max(0, Math.min(toIndex, target.length));
  target.splice(idx, 0, { ...card, status: toStatus });
  next[toStatus] = target;
  return next;
}

/** Sustituye los datos de una tarjeta (p. ej. nueva version tras éxito). */
export function patchCard(state: BoardState, id: string, patch: Partial<KanbanCard>): BoardState {
  const loc = locate(state, id);
  if (!loc) return state;
  const col = [...state[loc.status]];
  col[loc.index] = { ...col[loc.index]!, ...patch };
  return { ...state, [loc.status]: col };
}

export function insertCard(state: BoardState, card: KanbanCard, index = 0): BoardState {
  const col = [...state[card.status]];
  col.splice(Math.max(0, Math.min(index, col.length)), 0, card);
  return { ...state, [card.status]: col };
}

/** Resumen origen→destino para el modal de bulk update. */
export function summarizeSelection(state: BoardState, ids: Iterable<string>) {
  const set = new Set(ids);
  const byStatus = new Map<OrderStatus, number>();
  for (const s of ORDER_STATUSES) {
    const n = state[s].filter((c) => set.has(c.id)).length;
    if (n) byStatus.set(s, n);
  }
  return byStatus;
}
