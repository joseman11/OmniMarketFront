/// <reference types="cypress" />

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Inicia sesión con la cookie de prueba aceptada sólo con E2E_MOCK_AUTH=true. */
      login(): Chainable<void>;
    }
  }
}

Cypress.Commands.add("login", () => {
  cy.setCookie("omni_session", "e2e-mock-session", { domain: "localhost", path: "/", httpOnly: true });
});

export {};
