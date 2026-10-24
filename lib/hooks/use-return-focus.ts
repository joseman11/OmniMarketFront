"use client";

import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Retorno de foco para diálogos Radix abiertos por estado (sin DialogTrigger/SheetTrigger).
 * Al abrir se recuerda el elemento enfocado; el useLayoutEffect corre antes que el
 * autofocus de Radix (useEffect), así que aún es el invocador. Al cerrar se le devuelve
 * el foco o, si ya no existe (fila eliminada, apertura por atajo o URL), al `fallback`.
 * `preferFallback` indica que la acción que cierra el diálogo va a eliminar al invocador
 * (fila borrada, barra de selección que se oculta): se va directo al destino alternativo.
 * Uso: <DialogContent onCloseAutoFocus={useReturnFocus(open, fallbackRef)} />
 */
export function useReturnFocus(
  open: boolean,
  fallback?: RefObject<HTMLElement | null>,
  preferFallback?: RefObject<boolean>,
) {
  const returnTo = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    if (preferFallback) preferFallback.current = false;
    const active = document.activeElement;
    returnTo.current = active instanceof HTMLElement && active !== document.body ? active : null;
  }, [open]);

  return useCallback(
    (event: Event) => {
      const previous = returnTo.current;
      returnTo.current = null;
      const useFallback = preferFallback?.current === true || !previous?.isConnected;
      const target = useFallback ? fallback?.current : previous;
      if (!target) return;
      event.preventDefault();
      target.focus();
    },
    [fallback, preferFallback],
  );
}
