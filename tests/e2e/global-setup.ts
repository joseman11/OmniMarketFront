import { mkdirSync, writeFileSync } from "node:fs";

export default async function globalSetup() {
  const port = Number(process.env.E2E_PORT ?? 3100);
  mkdirSync("tests/e2e/.auth", { recursive: true });
  writeFileSync(
    "tests/e2e/.auth/user.json",
    JSON.stringify({
      cookies: [
        {
          name: "omni_session",
          value: "e2e-mock-session",
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
