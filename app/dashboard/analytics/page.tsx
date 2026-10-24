import type { Metadata } from "next";
import { Suspense } from "react";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { AnalyticsSkeleton } from "@/components/dashboard/skeletons";

export const metadata: Metadata = { title: "Analítica" };

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsView />
    </Suspense>
  );
}
