import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginPanel } from "@/components/auth/login-panel";
import { getBackendUser } from "@/lib/server/session";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  if (await getBackendUser()) redirect("/dashboard");
  const { error, callbackUrl } = await searchParams;
  return <LoginPanel error={error} callbackUrl={callbackUrl} />;
}
