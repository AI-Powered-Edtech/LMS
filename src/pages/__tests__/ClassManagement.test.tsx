import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { ClassManagement } from '../ClassManagement'

describe('ClassManagement', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<ClassManagement />)
    expect(container).toBeTruthy()
  })
})
