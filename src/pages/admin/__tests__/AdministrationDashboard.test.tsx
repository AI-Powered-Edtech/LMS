import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '@/src/testing/test-utils'

import { AdministrationDashboard } from '../AdministrationDashboard'

describe('AdministrationDashboard', () => {
  it('renders without crashing', () => {
    const { container } = renderWithProviders(<AdministrationDashboard />)
    expect(container).toBeTruthy()
  })
})
