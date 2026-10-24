"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export function ErrorView({
  error,
  reset,
  homeHref = "/",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  homeHref?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex min-h-[60svh] max-w-lg flex-col items-center justify-center text-center">
      <div className="grid size-14 place-items-center rounded-2xl border border-danger/30 bg-danger/10">
        <AlertTriangle className="size-6 text-danger" />
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">
        Algo <span className="font-serif font-normal italic text-brand-soft">salió mal</span>
      </h1>
      <p className="mt-3 text-sm text-white/55">
        Ocurrió un error inesperado al mostrar esta sección. Puedes reintentar sin perder tu sesión.
      </p>
      {error.digest && <p className="mt-2 font-mono text-[11px] text-white/30">ref: {error.digest}</p>}
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-black hover:bg-white/90"
        >
          <RotateCcw className="size-4" /> Reintentar
        </button>
        <Link href={homeHref} className="inline-flex h-10 items-center rounded-full border border-white/15 px-5 text-sm text-white hover:bg-white/5">
          Volver
        </Link>
      </div>
    </div>
  );
}
