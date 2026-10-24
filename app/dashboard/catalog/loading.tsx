import { Skeleton } from "@/components/ui/skeleton";

export default function CatalogLoading() {
  return <div className="mx-auto max-w-7xl"><Skeleton className="mb-8 h-12 w-72" /><div className="grid gap-4 lg:grid-cols-[220px_1fr]"><Skeleton className="h-48 rounded-2xl" /><Skeleton className="h-[420px] rounded-2xl" /></div></div>;
}
