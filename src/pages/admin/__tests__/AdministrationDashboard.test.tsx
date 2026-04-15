import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { AdministrationDashboard } from '../AdministrationDashboard'

describe('AdministrationDashboard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<AdministrationDashboard />)
    expect(container).toBeTruthy()
  })
})
