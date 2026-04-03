import { Page } from '@playwright/test'

/**
 * Waits for a specific content selector to appear and be visible.
 */
export async function waitForContent(
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout })
}

/**
 * Clicks an element with retry logic, useful for flaky interactions.
 */
export async function clickWithRetry(
  page: Page,
  selector: string,
  maxRetries: number = 3
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.click(selector, { timeout: 3000 })
      return // Success
    } catch (e) {
      if (i === maxRetries - 1) throw e
      // Wait a bit before retrying
      await page.waitForTimeout(1000)
    }
  }
}
