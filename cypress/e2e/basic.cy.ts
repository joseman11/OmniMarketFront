describe('Landing and basic navigation', () => {
  it('loads landing page', () => {
    cy.visit('/')
    cy.contains('OmniMarket').should('exist')
  })
})
