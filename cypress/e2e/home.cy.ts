/// <reference types="cypress" />

/**
 * Smoke test de la página principal.
 * Verifica que la landing responde, renderiza todas sus secciones y
 * termina de cargar sin errores de JavaScript en el navegador.
 */
describe("Página principal", () => {
  it("carga completamente la landing", () => {
    const pageErrors: Error[] = [];

    cy.on("uncaught:exception", (error) => {
      pageErrors.push(error);
      // Dejamos que Cypress falle al final con el detalle, en lugar de cortar aquí.
      return false;
    });

    // La home debe responder antes de renderizar.
    cy.request("/").its("status").should("eq", 200);

    cy.visit("/");
    cy.document().its("readyState").should("eq", "complete");

    // Navegación principal.
    cy.get('header nav[aria-label="Principal"]').should("be.visible");
    cy.get('a[aria-label="OmniMarket, inicio"]').should("be.visible");
    cy.get('header nav[aria-label="Principal"] a[href="/login"]').should("be.visible");

    // Hero.
    cy.get("section#producto").should("be.visible");
    cy.get("h1#hero-title").should("be.visible").and("contain.text", "Vende más");
    cy.contains('a[href="/login"]', "Empieza gratis").should("be.visible");

    // Secciones que componen la landing.
    cy.get('section[aria-label="Beneficios"]').should("exist");
    cy.get("section#preview").should("exist");
    cy.get("h2#preview-title").should("contain.text", "Todo tu negocio");
    cy.get('section[aria-label="Funciones principales"]').should("exist");
    cy.get("article#analitica").should("exist");
    cy.get("article#kanban").should("exist");
    cy.get("section h2#orders-title").should("exist");
    cy.get("section h2#cta-title").should("contain.text", "Tu operación");

    // Recorremos la página para disparar la carga diferida del contenido.
    cy.scrollTo("bottom", { duration: 500 });
    cy.get("footer").should("be.visible").and("contain.text", "OmniMarket");
    cy.get('footer nav[aria-label="Pie de página"] a').should("have.length.at.least", 4);

    // Las imágenes deben haber resuelto correctamente.
    cy.get("img").each(($img) => {
      const img = $img[0] as HTMLImageElement;
      expect(img.naturalWidth, `imagen ${img.src} cargada`).to.be.greaterThan(0);
    });

    // Sin errores de JavaScript durante toda la carga.
    cy.then(() => {
      expect(pageErrors, "errores de JavaScript en la página").to.have.length(0);
    });
  });
});
