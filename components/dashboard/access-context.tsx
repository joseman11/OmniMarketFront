"use client";

import { createContext, useContext } from "react";

const DashboardAccessContext = createContext({ isAdmin: false });

export function DashboardAccessProvider({
  isAdmin,
  children,
}: {
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  return <DashboardAccessContext.Provider value={{ isAdmin }}>{children}</DashboardAccessContext.Provider>;
}

export function useDashboardAccess() {
  return useContext(DashboardAccessContext);
}
