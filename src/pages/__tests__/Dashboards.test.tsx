import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { Dashboards } from '../Dashboards'

describe('Dashboards', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Dashboards />)
    expect(container).toBeTruthy()
  })
})
