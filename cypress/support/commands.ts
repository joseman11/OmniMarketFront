/// <reference types="cypress" />

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Inicia sesión firmando un JWT de Auth.js (sin pasar por OAuth). */
      login(): Chainable<void>;
    }
  }
}

Cypress.Commands.add("login", () => {
  cy.task<string>("sessionToken").then((token) => {
    cy.setCookie("authjs.session-token", token, { domain: "localhost", path: "/", httpOnly: true });
  });
});

export {};
