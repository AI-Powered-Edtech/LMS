import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { DocumentManager } from '../DocumentManager'

describe('DocumentManager', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<DocumentManager />)
    expect(container).toBeTruthy()
  })
})
