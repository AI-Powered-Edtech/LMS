import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { StudentClassPage } from '../StudentClassPage'

describe('StudentClassPage', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<StudentClassPage />)
    expect(container).toBeTruthy()
  })
})
