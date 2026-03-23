import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { StudentProgress } from '../StudentProgress'

describe('StudentProgress', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<StudentProgress />)
    expect(container).toBeTruthy()
  })
})
