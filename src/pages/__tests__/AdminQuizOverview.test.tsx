import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { AdminQuizOverview } from '../AdminQuizOverview'

describe('AdminQuizOverview', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<AdminQuizOverview />)
    expect(container).toBeTruthy()
  })
})
