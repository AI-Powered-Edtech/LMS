import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { Certificates } from '../Certificates'

describe('Certificates', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<Certificates />)
    expect(container).toBeTruthy()
  })
})
