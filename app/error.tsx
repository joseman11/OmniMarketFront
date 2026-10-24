"use client";

import { ErrorView } from "@/components/error-view";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-[100svh] bg-ink px-4">
      <ErrorView error={error} reset={reset} />
    </main>
  );
}
