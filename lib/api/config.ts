/** Activa el adaptador mock en el cliente. En producción debe ser "false". */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

/** Base URL del backend. Vacío = mismo origen (rutas /api/* de esta app). */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

/** SLA de latencia exigido por el análisis técnico. */
export const LATENCY_SLA_MS = 300;
