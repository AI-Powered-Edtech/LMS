import { describe, expect, it } from 'vitest'

import { renderWithAllProviders } from '@/src/testing/test-utils'

import { VerifyEmail } from '../VerifyEmail'

describe('VerifyEmail', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<VerifyEmail />)
    expect(container).toBeTruthy()
  })
})
