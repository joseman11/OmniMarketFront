describe('Autenticación', () => {
  it('rutas protegidas redirigen a /login', () => {
    cy.visit('/dashboard/kanban')
    cy.url().should('include', '/login')
    cy.url().should('include', 'callbackUrl')
  })

  it('login solo ofrece Google y GitHub sin campos de contraseña', () => {
    cy.visit('/login')
    cy.get('[data-testid="login-google"]').should('be.visible')
    cy.get('[data-testid="login-github"]').should('be.visible')
    cy.get('input[type="password"]').should('have.length', 0)
    cy.get('input[type="email"]').should('have.length', 0)
    cy.get('input[type="text"]').should('have.length', 0)
  })

  it('muestra toast con error AccessDenied', () => {
    cy.visit('/login?error=AccessDenied')
    cy.contains('Acceso denegado').should('be.visible')
  })
})
