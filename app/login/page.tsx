import type { Metadata } from "next";
import { LoginPanel } from "@/components/auth/login-panel";

export const metadata: Metadata = { title: "Iniciar sesión" };

/** Siempre muestra la elección de proveedor: aunque exista una sesión, entrar exige verificar de nuevo. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;
  return <LoginPanel error={error} callbackUrl={callbackUrl} />;
}
