"use client";

import { createContext, useContext } from "react";
import { todayIso } from "@/lib/analytics";

const ReferenceDateContext = createContext<string | null>(null);

/**
 * Fecha de referencia ("hoy" en la zona de negocio) calculada en el servidor. El HTML de
 * SSR y la hidratación usan la misma fecha aunque la petición cruce la medianoche o el
 * navegador esté en otra zona horaria.
 */
export function ReferenceDateProvider({ value, children }: { value: string; children: React.ReactNode }) {
  return <ReferenceDateContext.Provider value={value}>{children}</ReferenceDateContext.Provider>;
}

export function useReferenceDate(): string {
  return useContext(ReferenceDateContext) ?? todayIso();
}
