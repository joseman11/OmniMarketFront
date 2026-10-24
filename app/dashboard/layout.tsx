import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { getBackendUser } from "@/lib/server/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const backendUser = await getBackendUser();
  if (!backendUser) redirect("/login");

  const user = {
    name: backendUser.name ?? backendUser.email ?? "Usuario",
    email: backendUser.email,
    image: backendUser.image,
    role: backendUser.role === "ADMIN" ? "Administrador" : "Operador",
    isAdmin: backendUser.role === "ADMIN",
  };

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
