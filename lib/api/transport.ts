import { API_BASE_URL, USE_MOCKS } from "./config";

export type HttpMethod = "GET" | "POST" | "PATCH";

export type TransportRequest = {
  method: HttpMethod;
  path: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  signal?: AbortSignal;
};

export type TransportResponse = {
  status: number;
  body: unknown;
  latencyMs: number;
};

export function buildUrl(path: string, query?: TransportRequest["query"]): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return `${API_BASE_URL}${path}${qs ? `?${qs}` : ""}`;
}

async function httpTransport(req: TransportRequest): Promise<TransportResponse> {
  const started = performance.now();
  const res = await fetch(buildUrl(req.path, req.query), {
    method: req.method,
    headers: req.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
    credentials: "include",
    cache: "no-store",
    signal: req.signal,
  });
  const text = await res.text();
  const latencyMs = performance.now() - started;
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text.slice(0, 300) };
    }
  }
  return { status: res.status, body, latencyMs };
}

export async function transport(req: TransportRequest): Promise<TransportResponse> {
  if (USE_MOCKS) {
    const { mockTransport } = await import("./mock/server");
    return mockTransport(req);
  }
  return httpTransport(req);
}
