#!/usr/bin/env node

import process from "node:process";

const defaults = {
  front: process.env.OMNIMARKET_FRONT_URL ?? "https://omni-market-front.vercel.app",
  back: process.env.OMNIMARKET_API_URL ?? "https://omni-market-back.vercel.app",
  timeoutMs: 6000,
  slaMs: 300,
  repeats: 3,
};

function parseArgs(argv) {
  const options = { ...defaults, json: false };
  const flags = new Map([
    ["--front", "front"],
    ["--back", "back"],
    ["--timeout-ms", "timeoutMs"],
    ["--sla-ms", "slaMs"],
    ["--repeats", "repeats"],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--json") {
      options.json = true;
      continue;
    }
    if (flag === "--help" || flag === "-h") {
      options.help = true;
      continue;
    }
    const key = flags.get(flag);
    if (!key || argv[index + 1] === undefined) {
      throw new Error(`Argumento desconocido o incompleto: ${flag}`);
    }
    const value = argv[index + 1];
    options[key] = ["timeoutMs", "slaMs", "repeats"].includes(key) ? Number(value) : value;
    index += 1;
  }

  for (const key of ["timeoutMs", "slaMs", "repeats"]) {
    if (!Number.isInteger(options[key]) || options[key] <= 0) {
      throw new Error(`--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} debe ser un entero positivo.`);
    }
  }
  options.front = normalizeOrigin(options.front, "frontend");
  options.back = normalizeOrigin(options.back, "backend");
  return options;
}

function normalizeOrigin(value, name) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`La URL del ${name} debe usar HTTP o HTTPS.`);
  }
  return url.origin;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const results = [];
const unreachable = new Set();

async function check(target, name, path, validate) {
  if (unreachable.has(target)) {
    results.push({ target, name, path, ok: false, skipped: true, status: "SKIP", ms: null, detail: "Se omite: no hubo conexión con este origen." });
    return;
  }

  const origin = target === "frontend" ? config.front : config.back;
  const url = new URL(path, `${origin}/`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const started = performance.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json, text/html;q=0.9, */*;q=0.8" },
      redirect: "manual",
      signal: controller.signal,
    });
    const bodyText = await response.text();
    const ms = Math.round((performance.now() - started) * 10) / 10;
    unreachable.delete(target);
    const body = parseJson(bodyText);

    try {
      const detail = validate({ response, body, bodyText, url });
      results.push({ target, name, path, ok: true, status: response.status, ms, detail: detail ?? "OK" });
    } catch (error) {
      results.push({ target, name, path, ok: false, status: response.status, ms, detail: error.message });
    }
  } catch (error) {
    unreachable.add(target);
    const ms = Math.round((performance.now() - started) * 10) / 10;
    const detail = error.name === "AbortError" ? `Timeout tras ${config.timeoutMs} ms` : `Conexión fallida: ${error.message}`;
    results.push({ target, name, path, ok: false, status: "ERR", ms, detail });
  } finally {
    clearTimeout(timer);
  }
}

function requireStatus(status) {
  return ({ response }) => expect(response.status === status, `HTTP ${response.status}; se esperaba ${status}.`);
}

function validateAnalytics({ response, body }) {
  expect(response.status === 200, `HTTP ${response.status}; se esperaba 200.`);
  expect(body && typeof body === "object", "La respuesta no es JSON válido.");
  const summary = body.summary;
  expect(summary && typeof summary === "object", "Falta summary en la respuesta.");
  expect(summary.ordersCount === 3, `ordersCount=${summary.ordersCount}; se esperaba 3.`);
  expect(summary.revenue === "5360.00", `revenue=${summary.revenue}; se esperaba 5360.00.`);
  expect(summary.avgTicket === "1786.67", `avgTicket=${summary.avgTicket}; se esperaba 1786.67.`);
  expect(summary.grossMargin === "1625.00", `grossMargin=${summary.grossMargin}; se esperaba 1625.00.`);
  expect(body.pagination?.page === 1 && body.pagination?.limit === 50, "La paginación no coincide con page=1 y limit=50.");
  return `Ingresos ${summary.revenue}; ticket ${summary.avgTicket}; margen ${summary.grossMargin}`;
}

function validateContract({ response, body }) {
  expect(response.status === 200, `HTTP ${response.status}; se esperaba 200.`);
  expect(Array.isArray(body?.endpoints), "Falta la lista endpoints del contrato.");
  for (const endpoint of [
    "GET /api/test/analytics?page=1&limit=50",
    "GET /api/test/kanban-status?orderNumber=OM-TEST-1001",
  ]) {
    expect(body.endpoints.includes(endpoint), `Falta en el contrato: ${endpoint}.`);
  }
  return `${body.endpoints.length} rutas declaradas`;
}

function validateKanban({ response, body }) {
  expect(response.status === 200, `HTTP ${response.status}; se esperaba 200.`);
  expect(body?.orderNumber === "OM-TEST-1001", "No se encontró OM-TEST-1001.");
  expect(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].includes(body.status), `Estado inválido: ${body.status}.`);
  expect(Number.isInteger(body.version) && body.version >= 1, `Versión inválida: ${body.version}.`);
  return `Estado ${body.status}; versión ${body.version}`;
}

function validateDashboardRedirect({ response, url }) {
  const location = response.headers.get("location");
  expect([302, 303, 307, 308].includes(response.status), `HTTP ${response.status}; se esperaba redirección a /login.`);
  expect(location, "La redirección no incluye Location.");
  expect(new URL(location, url).pathname === "/login", `Redirige a ${location}, no a /login.`);
  return `HTTP ${response.status} → ${new URL(location, url).pathname}`;
}

function validateHealth({ response, body }) {
  expect(response.status === 200, `HTTP ${response.status}; se esperaba 200.`);
  expect(body?.status === "ok" && body?.service === "omnimarket-api", "La respuesta de salud no coincide con el contrato.");
  return "API disponible";
}

let config;
try {
  config = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  console.error("Usa --help para ver las opciones.");
  process.exit(2);
}

if (config.help) {
  console.log(`Uso: npm run scrape:production -- [opciones]

Inspecciona ambos sitios con solicitudes GET; no modifica datos.

  --front URL       Origen frontend (default: ${config.front})
  --back URL        Origen backend (default: ${config.back})
  --timeout-ms N    Timeout por solicitud (default: ${config.timeoutMs})
  --sla-ms N        Límite por llamada de analítica (default: ${config.slaMs})
  --repeats N       Muestras por origen para analítica (default: ${config.repeats})
  --json            Imprime el informe como JSON`);
  process.exit(0);
}

// Probe analytics first on each origin so sample 1 records the least-warmed request.
for (const target of ["backend", "frontend"]) {
  for (let index = 0; index < config.repeats; index += 1) {
    await check(
      target,
      `Analítica ${index + 1}/${config.repeats} (SLA ${config.slaMs} ms)`,
      "/api/test/analytics?page=1&limit=50",
      validateAnalytics,
    );
    const sample = results.at(-1);
    if (sample.ok && sample.ms > config.slaMs) {
      sample.ok = false;
      sample.detail = `${sample.detail}; tardó ${sample.ms} ms, supera el límite de ${config.slaMs} ms.`;
    }
  }
}

await check("frontend", "Portada pública", "/", requireStatus(200));
await check("frontend", "Login público", "/login", requireStatus(200));
await check("frontend", "Dashboard protegido", "/dashboard", validateDashboardRedirect);
await check("frontend", "Kanban protegido", "/dashboard/kanban", validateDashboardRedirect);
await check("backend", "Salud backend", "/api/health", validateHealth);
await check("backend", "Contrato backend", "/api/test/contract", validateContract);
await check("frontend", "Contrato vía frontend", "/api/test/contract", validateContract);

for (const target of ["backend", "frontend"]) {
  await check(target, "Límite máximo de analítica", "/api/test/analytics?page=1&limit=101", requireStatus(400));
  await check(target, "Lectura de estado Kanban", "/api/test/kanban-status?orderNumber=OM-TEST-1001", validateKanban);
}

const report = {
  generatedAt: new Date().toISOString(),
  origins: { frontend: config.front, backend: config.back },
  criteria: { analyticsSlaMs: config.slaMs, analyticsSamplesPerOrigin: config.repeats },
  summary: {
    passed: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok && !item.skipped).length,
    skipped: results.filter((item) => item.skipped).length,
  },
  checks: results,
};

if (config.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`\nScraper OmniMarket — ${report.generatedAt}`);
  console.log(`Frontend: ${config.front}`);
  console.log(`Backend:  ${config.back}`);
  console.log("");
  for (const item of results) {
    const result = item.skipped ? "SKIP" : item.ok ? "OK" : "FALLÓ";
    const time = item.ms === null ? "" : ` ${item.ms} ms`;
    console.log(`${result.padEnd(6)} ${item.target.padEnd(8)} ${item.name}${time} — ${item.detail}`);
  }
  console.log(`\nResultado: ${report.summary.passed} OK, ${report.summary.failed} fallidos, ${report.summary.skipped} omitidos.`);
}

if (report.summary.failed > 0 || report.summary.skipped > 0) process.exitCode = 1;
