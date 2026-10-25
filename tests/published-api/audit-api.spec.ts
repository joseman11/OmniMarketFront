import { expect, test } from "@playwright/test";

test("published analytics p95 stays under 300 ms directly and through the frontend proxy", async ({ request }) => {
  const backendUrl = (process.env.OMNIMARKET_API_URL ?? "https://omni-market-back.vercel.app").replace(/\/$/, "");
  const elapsed: Array<{ path: string; ms: number }> = [];
  const samplesPerPath = 10;

  // The audit query always reaches PostgreSQL now (no static fixture), so the first request of each origin may pay a
  // function cold start, which no code change removes. It is timed and logged, but only the warm samples that follow
  // are held to the 300 ms SLA.
  const coldStarts: Array<{ path: string; ms: number; status: number }> = [];
  for (const [path, send] of [
    ["backend", () => fetch(`${backendUrl}/api/test/analytics?page=1&limit=50`).then((response) => response.status)],
    ["frontend proxy", () => request.get("/api/test/analytics?page=1&limit=50").then((response) => response.status())],
  ] as const) {
    const startedAt = performance.now();
    const status = await send();
    coldStarts.push({ path, ms: Math.round((performance.now() - startedAt) * 10) / 10, status });
    expect(status).toBe(200);
  }
  console.log(`Published analytics warm-up (not held to the SLA): ${JSON.stringify(coldStarts)}`);

  for (let index = 0; index < samplesPerPath; index += 1) {
    const startedAt = performance.now();
    const response = await fetch(`${backendUrl}/api/test/analytics?page=1&limit=50`);
    expect(response.status).toBe(200);
    const body = await response.json();
    const ms = Math.round((performance.now() - startedAt) * 10) / 10;
    elapsed.push({ path: "backend", ms });
    expectAnalyticsContract(body);
  }

  for (let index = 0; index < samplesPerPath; index += 1) {
    const startedAt = performance.now();
    const response = await request.get("/api/test/analytics?page=1&limit=50");
    expect(response.status()).toBe(200);
    const body = await response.json();
    const ms = Math.round((performance.now() - startedAt) * 10) / 10;
    elapsed.push({ path: "frontend proxy", ms });
    expectAnalyticsContract(body);
  }

  const summaries = ["backend", "frontend proxy"].map((path) => {
    const samples = elapsed.filter((sample) => sample.path === path).map((sample) => sample.ms);
    return {
      path,
      samples: samples.length,
      p50: percentile(samples, 50),
      p95: percentile(samples, 95),
      max: Math.max(...samples),
    };
  });
  console.log(`Published analytics timings: ${JSON.stringify({ elapsed, summaries })}`);
  for (const summary of summaries) {
    expect(summary.p95, `${summary.path} analytics p95 took ${summary.p95} ms`).toBeLessThan(300);
  }

});

function percentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * (percentile / 100);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const fraction = position - lowerIndex;
  const value = sorted[lowerIndex]! * (1 - fraction) + sorted[upperIndex]! * fraction;
  return Math.round(value * 10) / 10;
}

function expectAnalyticsContract(body: unknown) {
  expect(body).toEqual(expect.objectContaining({
    summary: expect.objectContaining({
      ordersCount: expect.any(Number),
      revenue: expect.stringMatching(/^\d+\.\d{2}$/),
      avgTicket: expect.stringMatching(/^\d+\.\d{2}$/),
      grossMargin: expect.stringMatching(/^\d+\.\d{2}$/),
    }),
    pagination: expect.objectContaining({ page: 1, limit: 50 }),
  }));
}

test("the published analytics endpoint rejects an oversized page", async ({ request }) => {
  const response = await request.get("/api/test/analytics?page=1&limit=101");
  expect(response.status()).toBe(400);
});

test("frontend proxy exposes the published Kanban status", async ({ request }) => {
  const response = await request.get("/api/test/kanban-status?orderNumber=OM-TEST-1001");
  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body).toEqual(expect.objectContaining({
    orderNumber: "OM-TEST-1001",
    status: expect.stringMatching(/^(PENDING|PROCESSING|SHIPPED|DELIVERED|CANCELLED)$/),
    version: expect.any(Number),
  }));
});
