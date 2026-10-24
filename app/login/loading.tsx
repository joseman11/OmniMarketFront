import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-ink px-4" aria-busy="true" aria-label="Cargando inicio de sesión">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0b0b10]/70 p-10">
        <Skeleton className="mx-auto h-6 w-40" />
        <Skeleton className="mx-auto mt-8 h-9 w-64" />
        <Skeleton className="mx-auto mt-4 h-4 w-72" />
        <Skeleton className="mt-8 h-14 w-full rounded-2xl" />
        <Skeleton className="mt-4 h-14 w-full rounded-2xl" />
      </div>
    </main>
  );
}
