"use client";

import { createContext, useContext, useMemo } from "react";

const DashboardAccessContext = createContext({ canManageCatalog: false });

export function DashboardAccessProvider({
  canManageCatalog,
  children,
}: {
  canManageCatalog: boolean;
  children: React.ReactNode;
}) {
  // Valor estable: el shell re-renderiza a menudo y no debe invalidar a todos los consumidores.
  const value = useMemo(() => ({ canManageCatalog }), [canManageCatalog]);
  return <DashboardAccessContext.Provider value={value}>{children}</DashboardAccessContext.Provider>;
}

export function useDashboardAccess() {
  return useContext(DashboardAccessContext);
}
