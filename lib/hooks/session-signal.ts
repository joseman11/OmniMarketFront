"use client";

import { createContext, useContext } from "react";

/**
 * Señal de cancelación de las lecturas de una sesión. Se aborta cuando la sesión cliente
 * termina (logout, 401, cambio de identidad): en ese momento la caché entera se descarta,
 * así que ninguna petición compartida por SWR sigue teniendo consumidor. No se aborta por
 * desmontar un componente, porque SWR deduplica peticiones entre consumidores.
 */
export const SessionSignalContext = createContext<() => AbortSignal | undefined>(() => undefined);

export function useSessionSignal() {
  return useContext(SessionSignalContext);
}
