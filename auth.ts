import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

/**
 * Auth.js v5 — exclusivamente OAuth 2.0 (Google y GitHub).
 * No existe ni existirá un proveedor de credenciales (usuario/contraseña).
 * Las credenciales se leen de AUTH_GOOGLE_ID/SECRET y AUTH_GITHUB_ID/SECRET.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google, GitHub],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
  callbacks: {
    jwt({ token, account }) {
      if (account) {
        token.provider = account.provider;
        // TODO backend: el rol real debe venir de la BD (User.role).
        token.role = token.role ?? "Operador";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = typeof token.role === "string" ? token.role : "Operador";
        session.user.provider = typeof token.provider === "string" ? token.provider : undefined;
      }
      return session;
    },
  },
});
