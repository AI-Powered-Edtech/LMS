import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { AssignmentGradebook } from '../AssignmentGradebook'

describe('AssignmentGradebook', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<AssignmentGradebook />)
    expect(container).toBeTruthy()
  })
})
