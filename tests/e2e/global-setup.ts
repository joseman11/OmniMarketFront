import { mkdirSync, writeFileSync } from "node:fs";
import { encode } from "next-auth/jwt";
import { readE2ESecret } from "./secret";

const COOKIE = "authjs.session-token";

export default async function globalSetup() {
  const token = await encode({
    secret: readE2ESecret(),
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
