import { redirect } from "next/navigation";
import { ReferenceDateProvider } from "@/components/dashboard/reference-date";
import { SessionScope } from "@/components/dashboard/session-scope";
import { DashboardShell } from "@/components/dashboard/shell";
import { todayIso } from "@/lib/analytics";
import { getBackendUser } from "@/lib/server/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const backendUser = await getBackendUser();
  if (!backendUser) redirect("/login");

  const user = {
    name: backendUser.name ?? backendUser.email ?? "Usuario",
    email: backendUser.email,
    image: backendUser.image,
    role: backendUser.role === "ADMIN" ? "Administrador" : "Operador",
    // Cada cuenta es dueña de su espacio de trabajo y administra su propio catálogo.
    canManageCatalog: true,
  };

  // La caché de datos pertenece a esta identidad: cambiarla remonta el árbol.
  return (
    <SessionScope key={backendUser.id} userId={backendUser.id}>
      <ReferenceDateProvider value={todayIso()}>
        <DashboardShell user={user}>{children}</DashboardShell>
      </ReferenceDateProvider>
    </SessionScope>
  );
}
