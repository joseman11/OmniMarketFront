"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SWRConfig, type Cache, type SWRConfiguration } from "swr";
import { ApiError } from "@/lib/api/client";

const CHANNEL_NAME = "omnimarket.session";
const STORAGE_KEY = "omnimarket.session.event";

/** Sólo se transmite el ID de usuario (namespace, no credencial). */
type SessionEvent = { type: "logout" } | { type: "identity"; userId: string };

type SessionApi = {
  /** Vacía la caché de esta sesión y avisa a las demás pestañas antes de cerrar sesión. */
  beginSignOut: () => void;
};

const SessionContext = createContext<SessionApi>({ beginSignOut: () => {} });

export function useSessionScope() {
  return useContext(SessionContext);
}

function isSessionEvent(value: unknown): value is SessionEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as { type?: unknown; userId?: unknown };
  return event.type === "logout" || (event.type === "identity" && typeof event.userId === "string");
}

function clearCache(cache: Cache) {
  for (const key of [...cache.keys()]) cache.delete(key);
}

function broadcast(channel: BroadcastChannel | null, event: SessionEvent) {
  if (channel) {
    channel.postMessage(event);
    return;
  }
  try {
    // Fallback sin BroadcastChannel: el evento storage sólo llega a las otras pestañas.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...event, nonce: Date.now() + Math.random() }));
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sin almacenamiento */
  }
}

/**
 * Límite de caché por identidad verificada en servidor. Debe montarse con key={userId}:
 * un cambio de identidad remonta el árbol (caché y borradores nuevos). Al salir del
 * dashboard (logout, 401) la caché se descarta con el componente.
 *  - 401 en una lectura → termina la sesión cliente y navega a /login.
 *  - 403 es autorización: no cierra sesión.
 *  - logout / cambio de identidad se sincronizan entre pestañas.
 */
export function SessionScope({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [cache] = useState(() => new Map() as Cache);
  const [ended, setEnded] = useState(false);
  const endedRef = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  /** Vacía la caché y desmonta los consumidores (borradores incluidos) antes de navegar. */
  const terminate = useCallback(
    (navigate: () => void) => {
      if (endedRef.current) return;
      endedRef.current = true;
      clearCache(cache);
      setEnded(true);
      navigate();
    },
    [cache],
  );

  const toLogin = useCallback(() => {
    const callbackUrl = window.location.pathname + window.location.search;
    // Navegación completa: reinicia toda la memoria de la pestaña.
    window.location.assign(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }, []);

  useEffect(() => {
    const onEvent = (event: SessionEvent) => {
      if (event.type === "logout") terminate(() => window.location.assign("/login"));
      else if (event.userId !== userId) terminate(() => window.location.reload());
    };
    let channel: BroadcastChannel | null = null;
    let onStorage: ((e: StorageEvent) => void) | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (message) => {
        if (isSessionEvent(message.data)) onEvent(message.data);
      };
    } else {
      onStorage = (e) => {
        if (e.key !== STORAGE_KEY || !e.newValue) return;
        try {
          const parsed: unknown = JSON.parse(e.newValue);
          if (isSessionEvent(parsed)) onEvent(parsed);
        } catch {
          /* evento ajeno */
        }
      };
      window.addEventListener("storage", onStorage);
    }
    channelRef.current = channel;
    // Anuncia la identidad: otra pestaña con un usuario distinto se recarga.
    broadcast(channel, { type: "identity", userId });
    return () => {
      channel?.close();
      if (onStorage) window.removeEventListener("storage", onStorage);
      channelRef.current = null;
    };
  }, [terminate, userId]);

  const config = useMemo<SWRConfiguration>(
    () => ({
      provider: () => cache,
      onError: (error: unknown) => {
        if (error instanceof ApiError && error.status === 401) terminate(toLogin);
      },
    }),
    [cache, terminate, toLogin],
  );

  const api = useMemo<SessionApi>(
    () => ({
      beginSignOut: () => {
        clearCache(cache);
        broadcast(channelRef.current, { type: "logout" });
      },
    }),
    [cache],
  );

  return (
    <SessionContext.Provider value={api}>
      <SWRConfig value={config}>{ended ? null : children}</SWRConfig>
    </SessionContext.Provider>
  );
}
