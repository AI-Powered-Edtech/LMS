import React from 'react'
import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { DocumentManager } from '../DocumentManager'

describe('DocumentManager', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<DocumentManager />)
    expect(container).toBeTruthy()
  })
})
