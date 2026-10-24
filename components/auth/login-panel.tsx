"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/logo";
import { GitHubIcon, GoogleIcon } from "@/components/brand/provider-icons";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Button as MovingBorderButton } from "@/components/ui/moving-border";
import { Spotlight } from "@/components/ui/spotlight";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";

const AUTH_ERRORS: Record<string, { title: string; description: string }> = {
  AccessDenied: {
    title: "Acceso denegado",
    description: "Cancelaste la autorización o tu cuenta no tiene permiso para entrar.",
  },
  OAuthSignin: {
    title: "Proveedor no disponible",
    description: "No pudimos iniciar el flujo con el proveedor. Intenta de nuevo en unos segundos.",
  },
  OAuthCallback: {
    title: "Error al volver del proveedor",
    description: "El proveedor respondió con un error durante el inicio de sesión. Intenta de nuevo.",
  },
  OAuthAccountNotLinked: {
    title: "Cuenta no vinculada",
    description: "Ese correo ya está asociado a otro proveedor. Entra con el que usaste originalmente.",
  },
  Configuration: {
    title: "Configuración incompleta",
    description: "El inicio de sesión OAuth no está configurado en el servidor. Contacta al administrador.",
  },
};

const FALLBACK_ERROR = {
  title: "No se pudo iniciar sesión",
  description: "Ocurrió un error inesperado. Intenta de nuevo.",
};

/**
 * Formulario GET nativo hacia el proxy /api/auth/:provider. El navegador hace una navegación completa
 * (backend → proveedor OAuth → callback). No usar server actions + redirect(): Next intentaría
 * renderizar como RSC una respuesta de otro origen y acabaría en el error boundary.
 */
function ProviderForm({
  provider,
  testId,
  returnTo,
  children,
}: {
  provider: "google" | "github";
  testId: string;
  returnTo: string;
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);

  // Al volver con el botón "atrás" (bfcache) la página se restaura tal cual: reactivamos el botón.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setPending(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  return (
    <form action={`/api/auth/${provider}`} method="get" onSubmit={() => setPending(true)}>
      <input type="hidden" name="returnTo" value={returnTo} />
      <MovingBorderButton
        type="submit"
        data-testid={testId}
        aria-label={provider === "google" ? "Continuar con Google" : "Continuar con GitHub"}
        disabled={pending}
        borderRadius="1rem"
        duration={provider === "google" ? 3400 : 4200}
        containerClassName="h-14 w-full disabled:cursor-wait"
        borderClassName={
          provider === "google"
            ? "bg-[radial-gradient(#7c5cff_40%,transparent_60%)]"
            : "bg-[radial-gradient(#ff9a5c_40%,transparent_60%)]"
        }
        className="gap-3 border-white/10 bg-[#0d0d13]/90 text-[15px] font-medium text-white transition-colors hover:bg-[#14141c]"
      >
        {children}
        {pending && <span className="sr-only">Redirigiendo…</span>}
      </MovingBorderButton>
    </form>
  );
}

export function LoginPanel({ error, callbackUrl }: { error?: string; callbackUrl: string }) {
  const reduced = usePrefersReducedMotion();
  const shown = useRef<string | null>(null);

  useEffect(() => {
    if (!error || shown.current === error) return;
    shown.current = error;
    const e = AUTH_ERRORS[error] ?? FALLBACK_ERROR;
    toast.error(e.title, { description: e.description, id: `auth-${error}` });
  }, [error]);

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink px-4 py-16">
      <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" fill="#7c5cff" />
      {!reduced && <BackgroundBeams className="opacity-70" />}
      <div aria-hidden="true" className="bg-dots absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />

      <Link
        href="/"
        className="absolute top-6 left-6 z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white/60 backdrop-blur transition hover:text-white"
      >
        <ArrowLeft className="size-4" /> Volver
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        aria-labelledby="login-title"
        className="relative z-10 w-full max-w-md rounded-[28px] border border-white/10 bg-[#0b0b10]/70 p-8 shadow-[0_40px_120px_-30px_rgb(124_92_255/0.45)] backdrop-blur-2xl md:p-10"
      >
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <h1 id="login-title" className="text-center text-3xl font-semibold tracking-tight text-white md:text-4xl">
          Bienvenido <span className="font-serif font-normal italic text-brand-soft">de vuelta</span>
        </h1>
        <p className="mt-3 text-center text-sm text-white/55">
          Entra al centro de operaciones con tu cuenta de Google o GitHub.
        </p>

        <div className="mt-8 flex flex-col gap-4">
          <ProviderForm provider="google" testId="login-google" returnTo={callbackUrl}>
            <GoogleIcon className="size-5" /> Continuar con Google
          </ProviderForm>
          <ProviderForm provider="github" testId="login-github" returnTo={callbackUrl}>
            <GitHubIcon className="size-5" /> Continuar con GitHub
          </ProviderForm>
        </div>

        <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-white/40">
          <ShieldCheck className="size-3.5 text-success" />
          OAuth 2.0 · No almacenamos contraseñas
        </p>
      </motion.section>
    </main>
  );
}
