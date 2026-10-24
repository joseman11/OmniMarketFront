import { describe, expect, it } from "vitest";
import type { KanbanCard } from "@/lib/api/schemas";
import { emptyBoard, findContainer, insertCard, isStatus, locate, moveCard, patchCard, summarizeSelection, toBoardState, toKanbanBoard } from "@/lib/kanban";

const card = (id: string, status: KanbanCard["status"], position: number): KanbanCard => ({
  id,
  orderNumber: `OM-${id}`,
  customerName: "Cliente",
  total: 100,
  margin: 40,
  position,
  version: 1,
  status,
});

function board() {
  const b = emptyBoard();
  b.PENDING = [card("a", "PENDING", 0), card("b", "PENDING", 1)];
  b.SHIPPED = [card("c", "SHIPPED", 0)];
  return b;
}

describe("movimientos del Kanban", () => {
  it("mueve entre columnas sin mutar el estado original (base del rollback)", () => {
    const before = board();
    const after = moveCard(before, "a", "SHIPPED", 1);
    expect(after.PENDING.map((c) => c.id)).toEqual(["b"]);
    expect(after.SHIPPED.map((c) => c.id)).toEqual(["c", "a"]);
    expect(after.SHIPPED[1]!.status).toBe("SHIPPED");
    expect(before.PENDING.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("reordena dentro de la columna y recalcula position al serializar", () => {
    const after = moveCard(board(), "b", "PENDING", 0);
    const pending = toKanbanBoard(after).columns.find((c) => c.status === "PENDING")!;
    expect(pending.cards.map((c) => [c.id, c.position])).toEqual([["b", 0], ["a", 1]]);
  });

  it("localiza columnas y resume la selección por estado de origen", () => {
    const b = board();
    expect(findContainer(b, "c")).toBe("SHIPPED");
    expect(findContainer(b, "DELIVERED")).toBe("DELIVERED");
    expect([...summarizeSelection(b, ["a", "b", "c"])]).toEqual([["PENDING", 2], ["SHIPPED", 1]]);
  });

  it("reconoce sólo los estados admitidos y localiza tarjetas desconocidas como ausentes", () => {
    const b = board();
    expect(isStatus("PROCESSING")).toBe(true);
    expect(isStatus("UNKNOWN")).toBe(false);
    expect(locate(b, "missing")).toBeNull();
    expect(findContainer(b, "missing")).toBeNull();
  });

  it("acota inserciones y movimientos al rango de la columna", () => {
    const b = board();
    expect(insertCard(b, { ...b.PENDING[0]!, id: "new" }, 999).PENDING.map((c) => c.id)).toEqual(["a", "b", "new"]);
    expect(moveCard(b, "a", "SHIPPED", -5).SHIPPED.map((c) => c.id)).toEqual(["a", "c"]);
    expect(moveCard(b, "a", "SHIPPED", 999).SHIPPED.map((c) => c.id)).toEqual(["c", "a"]);
  });

  it("mantiene el tablero original al parchear e ignora ids desconocidos", () => {
    const b = board();
    const patched = patchCard(b, "a", { version: 2 });
    expect(patched.PENDING[0]?.version).toBe(2);
    expect(b.PENDING[0]?.version).toBe(1);
    expect(patchCard(b, "missing", { version: 2 })).toBe(b);
  });

  it("crea un tablero sin tarjetas en todas las columnas", () => {
    expect(Object.values(emptyBoard()).every((column) => column.length === 0)).toBe(true);
  });

  it("ordena las tarjetas recibidas por posición", () => {
    const source = board();
    const response = toKanbanBoard(source);
    response.columns.find((column) => column.status === "PENDING")!.cards.reverse();
    const restored = toBoardState(response);
    expect(restored.PENDING.map((card) => [card.id, card.position])).toEqual([["a", 0], ["b", 1]]);
  });
});
