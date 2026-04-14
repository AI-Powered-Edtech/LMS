import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { StudentProgress } from '../StudentProgress'

describe('StudentProgress', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<StudentProgress />)
    expect(container).toBeTruthy()
  })
})
