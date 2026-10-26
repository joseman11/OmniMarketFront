import { cleanup } from "@testing-library/react";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

// Radix Select checks pointer capture while moving between options. jsdom has no pointer-capture API,
// so provide harmless stubs to let component tests exercise the real keyboard and click interactions.
if (typeof HTMLElement !== "undefined") {
  if (typeof HTMLElement.prototype.scrollIntoView !== "function") {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: () => undefined,
    });
  }

  const pointerCaptureStubs: PropertyDescriptorMap = {
    hasPointerCapture: { configurable: true, value: () => false },
    setPointerCapture: { configurable: true, value: () => undefined },
    releasePointerCapture: { configurable: true, value: () => undefined },
  };
  for (const [name, descriptor] of Object.entries(pointerCaptureStubs)) {
    if (typeof (HTMLElement.prototype as unknown as Record<string, unknown>)[name] !== "function") {
      Object.defineProperty(HTMLElement.prototype, name, descriptor);
    }
  }
}

// Node ≥ 22 expone un localStorage experimental que, sin --localstorage-file, no implementa la
// API y tapa al de jsdom. Se instala un Storage en memoria equivalente.
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}
for (const name of ["localStorage", "sessionStorage"] as const) {
  if (typeof window[name]?.removeItem !== "function") {
    Object.defineProperty(window, name, { configurable: true, value: memoryStorage() });
  }
}

/** Servidor MSW compartido: cada test registra sus handlers con server.use(). */
export const server = setupServer();

let mswFetch: typeof fetch;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  // El cliente usa rutas relativas (/backend/…, /api/…): se resuelven contra el origen de jsdom.
  mswFetch = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    mswFetch(typeof input === "string" && input.startsWith("/") ? new URL(input, window.location.origin) : input, init)) as typeof fetch;
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  globalThis.fetch = mswFetch;
  server.close();
});
