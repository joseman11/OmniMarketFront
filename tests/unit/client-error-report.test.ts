import { describe, expect, it } from "vitest";
import { clientErrorReportSchema, redactClientErrorReport, redactText } from "@/lib/client-error-report";

const base = { message: "boom", name: "Error", path: "/dashboard", userAgent: "UA" };

describe("reporte de errores del cliente", () => {
  it("acepta el contrato de buildClientErrorReport", () => {
    expect(clientErrorReportSchema.safeParse({ ...base, stack: "at x", digest: "123" }).success).toBe(true);
  });

  it.each([
    ["JSON arbitrario", { foo: "bar" }],
    ["campos extra", { ...base, cookie: "omni_session=abc" }],
    ["mensaje demasiado largo", { ...base, message: "x".repeat(1001) }],
    ["tipo incorrecto", { ...base, message: 42 }],
  ])("rechaza %s", (_name, body) => {
    expect(clientErrorReportSchema.safeParse(body).success).toBe(false);
  });

  it("redacta correos, tokens, query strings y números largos", () => {
    const text = redactText(
      "fallo para ana@example.mx con Bearer abc.def-123 eyJhbGciOi.eyJzdWIi.c2lnbmF0dXJl en https://x.mx/a?token=1 y /login?callbackUrl=%2Fd tarjeta 4111 1111 1111 1111",
    );
    expect(text).not.toMatch(/ana@example\.mx|abc\.def-123|eyJhbGciOi|token=1|callbackUrl|4111/);
    expect(text).toContain("[email]");
    expect(text).toContain("https://x.mx/a?[query]");
  });

  it("redacta mensaje, stack y ruta del reporte", () => {
    const redacted = redactClientErrorReport({ ...base, message: "user ana@example.mx", stack: "at /p?x=1", path: "/dashboard?x=1" });
    expect(redacted.message).toBe("user [email]");
    expect(redacted.stack).toBe("at /p?[query]");
    expect(redacted.path).toBe("/dashboard?[query]");
  });
});
