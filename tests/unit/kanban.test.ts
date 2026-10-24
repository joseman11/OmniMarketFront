import { describe, expect, it } from "vitest";
import type { KanbanCard } from "@/lib/api/schemas";
import { emptyBoard, findContainer, moveCard, summarizeSelection, toKanbanBoard } from "@/lib/kanban";

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
});
