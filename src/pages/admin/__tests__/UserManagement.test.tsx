import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { UserManagement } from '../UserManagement'

describe('UserManagement', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<UserManagement />)
    expect(container).toBeTruthy()
  })
})
