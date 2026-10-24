describe('Authenticated flows', () => {
  beforeEach(() => {
    cy.setCookie('authjs.session-token', 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwia2lkIjoiU0tzdmJlYTN3YlFzcXViMmVoMjdiU1h0a19Zd2VlNGhDV0ZoeG1yNWx4eWJBUVlJVlgwak1tN0VmUk54VlRPRjdkT3lHN0xPeDBDdVQzNXRRcmViMHcifQ..iShfj5Ob9Ipf8tYTXf6pRQ.91rlEAeqwEc2Oeul-NzlKKaRkWRZcqQ_YU02b_H7-FIADlZRTJ9RS6eMjoeTQg6ssbLGXMI2KdTH76WHXECvxpJHM_5Eoli4mawUIw9ZlNLHR7vrrVHKJZ_hJi8hH4GFDxv1-dl71lhCIICdmsby5llxj0vtzzPdd6CgWXMzHEiAt_yJXh6cvzALwlx7LEy3MyBlYADu5yDjlrtXRuBFQ7daH3M-OT3B_Ur4i9U0084.uXaTzmPsK5liGRK7tBRoaai5urq_vAQZTkWWM8S0_3A', { domain: 'localhost', path: '/' })
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
    cy.get('[data-testid="nav-audit"]').should('exist')
  })

  it('kanban loads', () => {
    cy.visit('/dashboard/kanban')
    cy.get('[data-testid="kanban-column-PENDING"]').should('exist')
  })

  it('audit page loads', () => {
    cy.visit('/dashboard/audit')
    cy.contains('Auditoría').should('exist')
  })

  it('analytics page loads', () => {
    cy.visit('/dashboard/analytics')
    cy.get('[data-testid="analytics-table"]').should('exist')
  })
})
