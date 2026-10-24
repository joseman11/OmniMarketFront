describe('Authenticated flows', () => {
  beforeEach(() => {
    cy.login()
  })

  it('can access dashboard', () => {
    cy.visit('/dashboard')
    cy.contains('Resumen').should('exist')
  })

  it('navegation links exist', () => {
    cy.visit('/dashboard')
    cy.get('[data-testid="nav-resumen"]').should('exist')
    cy.get('[data-testid="nav-analytics"]').should('exist')
    cy.get('[data-testid="nav-kanban"]').should('exist')
  })

  it('kanban loads', () => {
    cy.visit('/dashboard/kanban')
    cy.get('[data-testid="kanban-column-PENDING"]').should('exist')
  })

  it('analytics page loads', () => {
    cy.visit('/dashboard/analytics')
    cy.get('[data-testid="analytics-table"]').should('exist')
  })
})
