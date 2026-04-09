/**
 * Accessibility test utilities for EduSync LMS.
 * Uses jest-axe (compatible with vitest) to detect WCAG violations.
 *
 * Usage:
 *   import { checkA11y, setupA11yMatchers } from '@/testing/a11y-utils'
 *
 *   beforeAll(() => setupA11yMatchers())
 *
 *   it('has no accessibility violations', async () => {
 *     const { container } = render(<MyComponent />)
 *     await checkA11y(container)
 *   })
 */
import { configureAxe, toHaveNoViolations } from 'jest-axe'
import { expect } from 'vitest'

export function setupA11yMatchers() {
  expect.extend(toHaveNoViolations)
}

// Auto-register matchers when the utility is imported
setupA11yMatchers()

const axe = configureAxe({
  rules: {
    // Skip color-contrast — requires rendered CSS, not available in jsdom
    'color-contrast': { enabled: false },
    // Skip landmark-unique for test components rendered in isolation
    'landmark-unique': { enabled: false },
  },
})

/**
 * Assert a rendered component container has no axe accessibility violations.
 * Color contrast is excluded (requires real browser rendering).
 */
export async function checkA11y(container: HTMLElement): Promise<void> {
  const results = await axe(container)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(expect(results) as any).toHaveNoViolations()
}
