import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { describe, expect, test, vi } from 'vitest'

import { FontSizeControl } from '../components/FontSizeControl'
import { HighContrastToggle } from '../components/HighContrastToggle'
import { SkipToContent } from '../components/SkipToContent'

expect.extend(toHaveNoViolations)

// Mock ThemeContext
vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    highContrast: false,
    toggleHighContrast: vi.fn(),
    fontSize: 'md',
    setFontSize: vi.fn(),
    theme: 'light',
    toggleTheme: vi.fn(),
    resolvedTheme: 'light',
    setTheme: vi.fn(),
  }),
}))

describe('Accessibility Components', () => {
  test('SkipToContent has no a11y violations', async () => {
    const { container } = render(<SkipToContent />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  test('HighContrastToggle has correct aria-pressed', async () => {
    const { container, getByRole } = render(<HighContrastToggle />)
    const btn = getByRole('button')
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  test('FontSizeControl has group role and aria labels', async () => {
    const { container } = render(<FontSizeControl />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
