/** Activa el adaptador mock en el cliente. En producción debe ser "false". */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

/** Las llamadas del navegador pasan por el proxy same-origin configurado en next.config.ts. */
export const API_BASE_URL = "";

/** SLA de latencia exigido por el análisis técnico. */
export const LATENCY_SLA_MS = 300;
