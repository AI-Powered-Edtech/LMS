import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/src/testing/test-utils'

import { UserManagement } from '../UserManagement'

describe('UserManagement', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<UserManagement />)
    expect(container).toBeTruthy()
  })
})
