import { z } from "zod";

/**
 * Respuesta de GET /api/auth/session del backend (publicUser). email, name e image son
 * columnas opcionales en el modelo User: se normalizan a null en lugar de rechazar la sesión.
 */
const backendUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().nullish().transform((value) => value ?? null),
  name: z.string().nullish().transform((value) => value ?? null),
  image: z.string().nullish().transform((value) => value ?? null),
  role: z.enum(["ADMIN", "OPERATOR"]),
});

const backendSessionSchema = z.object({ user: backendUserSchema.nullish() });

export type BackendUser = z.output<typeof backendUserSchema>;

/** Una respuesta malformada se trata como no autenticada (nunca como sesión válida). */
export function parseBackendSession(body: unknown): BackendUser | null {
  const parsed = backendSessionSchema.safeParse(body);
  return parsed.success ? (parsed.data.user ?? null) : null;
}
