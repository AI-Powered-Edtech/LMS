/**
 * Accessibility test utilities for EduSync LMS.
 * Uses jest-axe (compatible with vitest) to detect WCAG violations.
 *
 * Usage:
 *   import { checkA11y } from '@/testing/a11y-utils'
 *
 *   it('has no a11y violations', async () => {
 *     const { container } = render(<MyComponent />)
 *     await checkA11y(container)
 *   })
 *
 * Note: jest-axe matchers are registered in setupTests.ts.
 */
import { configureAxe, toHaveNoViolations } from 'jest-axe'
import { expect } from 'vitest'

// Register matchers once at module level
expect.extend(toHaveNoViolations)

const axe = configureAxe({
  rules: {
    // Disabled: requires computed CSS not available in jsdom
    'color-contrast': { enabled: false },
    // Disabled: components rendered in isolation won't have full landmark hierarchy
    'landmark-unique': { enabled: false },
    region: { enabled: false },
  },
})

/**
 * Assert that a rendered component has no axe-detectable WCAG violations.
 * Color-contrast is excluded because jsdom cannot compute CSS values.
 */
export async function checkA11y(container: HTMLElement): Promise<void> {
  const results = await axe(container)
  expect(results).toHaveNoViolations()
}
