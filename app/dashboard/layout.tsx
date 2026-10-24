import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Segunda capa de protección (la primera es el middleware): verificación real del JWT.
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = {
    name: session.user.name ?? session.user.email ?? "Usuario",
    email: session.user.email,
    image: session.user.image,
    role: session.user.role ?? "Operador",
  };

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
