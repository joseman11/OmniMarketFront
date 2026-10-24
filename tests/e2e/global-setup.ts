import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { encode } from "next-auth/jwt";

const COOKIE = "authjs.session-token";

function readSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  try {
    const env = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    const m = env.match(/^AUTH_SECRET=(.+)$/m);
    if (m?.[1]) return m[1].trim();
  } catch {
    /* sin .env.local */
  }
  return "e2e-only-secret-not-for-production-000000";
}

export default async function globalSetup() {
  const token = await encode({
    secret: readSecret(),
    salt: COOKIE,
    token: { sub: "e2e-user", name: "E2E Evaluador", email: "e2e@omnimarket.mx", role: "Operador" },
    maxAge: 60 * 60,
  });
  const port = Number(process.env.E2E_PORT ?? 3100);
  mkdirSync("tests/e2e/.auth", { recursive: true });
  writeFileSync(
    "tests/e2e/.auth/user.json",
    JSON.stringify({
      cookies: [
        {
          name: COOKIE,
          value: token,
          domain: "localhost",
          path: "/",
          expires: Math.floor(Date.now() / 1000) + 3600,
          httpOnly: true,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [{ origin: `http://localhost:${port}`, localStorage: [] }],
    }),
  );
}
