import type { Metadata } from "next";
import { Suspense } from "react";
import { KanbanSkeleton } from "@/components/dashboard/skeletons";
import { KanbanBoard } from "@/components/kanban/kanban-board";

export const metadata: Metadata = { title: "Kanban" };

export default function KanbanPage() {
  return (
    <Suspense fallback={<KanbanSkeleton />}>
      <KanbanBoard />
    </Suspense>
  );
}
