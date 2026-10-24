import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-ink px-4 text-center">
      <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-50 [--grid-size:64px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div aria-hidden="true" className="absolute top-1/3 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />
      <div className="relative">
        <Logo className="mb-10 justify-center" />
        <p className="font-mono text-sm tracking-[0.3em] text-brand-soft">ERROR 404</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white md:text-7xl">
          Esta orden <span className="font-serif font-normal italic text-brand-soft">no existe</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-white/55">La página que buscas se movió, se canceló o nunca salió del almacén.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex h-11 items-center rounded-full bg-white px-6 text-sm font-medium text-black hover:bg-white/90">
            Ir al inicio
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center rounded-full border border-white/15 bg-white/5 px-6 text-sm text-white hover:bg-white/10"
          >
            Abrir dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
