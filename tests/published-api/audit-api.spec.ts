import { expect, test } from "@playwright/test";

test("published analytics stays under 300 ms directly and through the frontend proxy", async ({ request }) => {
  const backendUrl = (process.env.OMNIMARKET_API_URL ?? "https://omni-market-back.vercel.app").replace(/\/$/, "");
  const elapsed: Array<{ path: string; ms: number }> = [];

  // Run the direct call first so it can capture an available cold-start sample.
  for (let index = 0; index < 3; index += 1) {
    const startedAt = performance.now();
    const response = await fetch(`${backendUrl}/api/test/analytics?page=1&limit=50`);
    const ms = Math.round((performance.now() - startedAt) * 10) / 10;
    elapsed.push({ path: "backend", ms });
    expect(response.status).toBe(200);
    const body = await response.json();
    expectAnalyticsContract(body);
  }

  for (let index = 0; index < 3; index += 1) {
    const startedAt = performance.now();
    const response = await request.get("/api/test/analytics?page=1&limit=50");
    const ms = Math.round((performance.now() - startedAt) * 10) / 10;
    elapsed.push({ path: "frontend proxy", ms });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expectAnalyticsContract(body);
  }

  console.log(`Published analytics timings: ${JSON.stringify(elapsed)}`);
  for (const sample of elapsed) {
    expect(sample.ms, `${sample.path} analytics took ${sample.ms} ms`).toBeLessThan(300);
  }

});

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
