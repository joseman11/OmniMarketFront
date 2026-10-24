import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center gap-5 bg-ink px-4" aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-7 w-72 rounded-full" />
      <Skeleton className="h-20 w-full max-w-3xl rounded-2xl" />
      <Skeleton className="h-5 w-full max-w-xl" />
      <div className="flex gap-4">
        <Skeleton className="h-12 w-36 rounded-full" />
        <Skeleton className="h-12 w-48 rounded-full" />
      </div>
    </main>
  );
}
