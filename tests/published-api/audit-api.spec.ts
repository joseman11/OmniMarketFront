import { expect, test } from "@playwright/test";

const backendUrl = (process.env.OMNIMARKET_API_URL ?? "https://omni-market-back.vercel.app").replace(/\/$/, "");
const analyticsPath = (page: number) => `/api/test/analytics?page=${page}&limit=50`;

type CapturedResponse = {
  status: number;
  body: unknown;
  cache: string | null;
  age: string | null;
};

type AnalyticsSample = CapturedResponse & { path: string; ms: number };

test("every published analytics page stays under 300 ms directly and through the frontend proxy", async ({ request }) => {
  const elapsed: AnalyticsSample[] = [];
  const samplesPerPath = 10;

  // Measure the first request too: no warm-up sample is excluded from the SLA.
  for (const page of [1, 2]) {
    for (let index = 0; index < samplesPerPath; index += 1) {
      elapsed.push(await measure(`backend page ${page}`, async () => {
        const response = await fetch(`${backendUrl}${analyticsPath(page)}`);
        return {
          status: response.status,
          body: await response.json(),
          cache: response.headers.get("x-vercel-cache"),
          age: response.headers.get("age"),
        };
      }));
    }

    for (let index = 0; index < samplesPerPath; index += 1) {
      elapsed.push(await measure(`frontend proxy page ${page}`, async () => {
        const response = await request.get(analyticsPath(page));
        const headers = await response.headers();
        return {
          status: response.status(),
          body: await response.json(),
          cache: headers["x-vercel-cache"] ?? null,
          age: headers.age ?? null,
        };
      }));
    }
  }

  console.log(`Published analytics timings (every sample is held to the SLA): ${JSON.stringify(elapsed)}`);
  for (const sample of elapsed) {
    expect(sample.status, `${sample.path} analytics returned HTTP ${sample.status}`).toBe(200);
    const page = Number(sample.path.match(/page (\d+)/)?.[1]);
    expectAnalyticsContract(sample.body, page);
    expect(sample.ms, `${sample.path} analytics took ${sample.ms} ms`).toBeLessThan(300);
  }
});

test("published audit URLs expose the contract, reject oversized analytics pages, and return Kanban status", async ({ request }) => {
  const origins = [
    {
      path: "backend",
      get: async (url: string): Promise<CapturedResponse> => {
        const response = await fetch(`${backendUrl}${url}`);
        return {
          status: response.status,
          body: await response.json(),
          cache: response.headers.get("x-vercel-cache"),
          age: response.headers.get("age"),
        };
      },
    },
    {
      path: "frontend proxy",
      get: async (url: string): Promise<CapturedResponse> => {
        const response = await request.get(url);
        const headers = await response.headers();
        return {
          status: response.status(),
          body: await response.json(),
          cache: headers["x-vercel-cache"] ?? null,
          age: headers.age ?? null,
        };
      },
    },
  ];

  for (const origin of origins) {
    const contract = await origin.get("/api/test/contract");
    expect(contract.status, `${origin.path} contract returned HTTP ${contract.status}`).toBe(200);
    expect(contract.body).toEqual(expect.objectContaining({
      endpoints: expect.arrayContaining([
        "GET /api/test/analytics?page=1&limit=50",
        "POST /api/test/reset-data",
        "GET /api/test/kanban-status?orderNumber=OM-TEST-1001",
      ]),
    }));

    const invalidAnalytics = await origin.get("/api/test/analytics?page=1&limit=101");
    expect(invalidAnalytics.status, `${origin.path} oversized analytics page`).toBe(400);

    const kanban = await origin.get("/api/test/kanban-status?orderNumber=OM-TEST-1001");
    expect(kanban.status, `${origin.path} Kanban URL returned HTTP ${kanban.status}`).toBe(200);
    expect(kanban.body).toEqual(expect.objectContaining({
      orderNumber: "OM-TEST-1001",
      status: expect.stringMatching(/^(PENDING|PROCESSING|SHIPPED|DELIVERED|CANCELLED)$/),
      version: expect.any(Number),
    }));
  }
});

async function measure(path: string, send: () => Promise<CapturedResponse>): Promise<AnalyticsSample> {
  const startedAt = performance.now();
  const response = await send();
  return {
    path,
    ...response,
    ms: Math.round((performance.now() - startedAt) * 10) / 10,
  };
}

function expectAnalyticsContract(body: unknown, page: number) {
  expect(body).toEqual(expect.objectContaining({
    summary: expect.objectContaining({
      ordersCount: expect.any(Number),
      revenue: expect.stringMatching(/^\d+\.\d{2}$/),
      avgTicket: expect.stringMatching(/^\d+\.\d{2}$/),
      grossMargin: expect.stringMatching(/^\d+\.\d{2}$/),
    }),
    pagination: expect.objectContaining({ page, limit: 50 }),
  }));
}
