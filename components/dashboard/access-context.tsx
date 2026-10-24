"use client";

import { createContext, useContext } from "react";

const DashboardAccessContext = createContext({ canManageCatalog: false });

export function DashboardAccessProvider({
  canManageCatalog,
  children,
}: {
  canManageCatalog: boolean;
  children: React.ReactNode;
}) {
  return <DashboardAccessContext.Provider value={{ canManageCatalog }}>{children}</DashboardAccessContext.Provider>;
}

export function useDashboardAccess() {
  return useContext(DashboardAccessContext);
}
