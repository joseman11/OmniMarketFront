import { describe, expect, it } from "vitest";
import { parseBackendSession } from "@/lib/server/session-schema";

describe("parseBackendSession (respuesta de /api/auth/session)", () => {
  it("acepta un usuario válido y normaliza opcionales a null", () => {
    expect(parseBackendSession({ user: { id: "u1", email: "a@b.mx", role: "OPERATOR" } })).toEqual({
      id: "u1",
      email: "a@b.mx",
      name: null,
      image: null,
      role: "OPERATOR",
    });
  });

  it("trata user null o ausente como no autenticado", () => {
    expect(parseBackendSession({ user: null })).toBeNull();
    expect(parseBackendSession({})).toBeNull();
  });

  it.each([
    ["sin cuerpo", null],
    ["user como string", { user: "admin" }],
    ["sin id", { user: { email: "a@b.mx", role: "ADMIN" } }],
    ["rol desconocido", { user: { id: "u1", email: "a@b.mx", role: "SUPERADMIN" } }],
    ["rol ausente", { user: { id: "u1", email: "a@b.mx" } }],
  ])("una respuesta malformada (%s) no autentica", (_name, body) => {
    expect(parseBackendSession(body)).toBeNull();
  });
});
