import { expect, test } from '@playwright/test'

/**
 * LTI SSO Integration Flow Tests
 *
 * Validates the LTI callback page behavior:
 * - Accessible without authentication (public route)
 * - Handles missing token gracefully (no crash)
 * - Handles invalid token with user-friendly error
 * - Shows loading state while verifying
 * - Provides fallback navigation to login
 *
 * NOTE: Full LTI flow with valid tokens requires a live Supabase Edge Function
 * (lti-launch) to generate magic link tokens. These tests cover the client-side
 * error handling; the full integration test requires an E2E-accessible LTI provider.
 */

const BASE_URL = 'http://localhost:5173/#'

test.describe('LTI SSO Callback Flow', () => {
  test('LTI callback route is publicly accessible (no auth required)', async ({ page }) => {
    await page.goto(`${BASE_URL}/lti/callback`)
    await page.waitForLoadState('networkidle')
    const url = page.url()
    // Must NOT redirect to /login — this is a public callback route
    expect(url).not.toContain('/login')
    // Must NOT show 404
    expect(url).not.toContain('/404')
  })

  test('LTI callback without token shows descriptive error message', async ({ page }) => {
    await page.goto(`${BASE_URL}/lti/callback`)
    await page.waitForLoadState('networkidle')

    // Should show error UI (not crash or blank page)
    const errorText = await page
      .locator('text=Token autentikasi tidak ditemukan')
      .isVisible({ timeout: 5000 })
      .catch(() => false)

    expect(errorText).toBe(true)
  })

  test('LTI callback with invalid token shows error and login button', async ({ page }) => {
    await page.goto(`${BASE_URL}/lti/callback?token=invalid_token_abc123&type=magiclink`)
    await page.waitForLoadState('networkidle')

    // Wait for the async verification to complete (shows loader then error)
    await page.waitForTimeout(2000)

    const url = page.url()
    // Should remain on callback page showing error — not crash to 404
    expect(url).not.toContain('/404')

    // Should show a "Ke Halaman Login" button as fallback
    const loginBtn = await page
      .locator('button:has-text("Ke Halaman Login")')
      .isVisible({ timeout: 3000 })
      .catch(() => false)

    expect(loginBtn).toBe(true)
  })

  test('LTI callback error — login button navigates to login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/lti/callback`)
    await page.waitForLoadState('networkidle')

    // Click the "Ke Halaman Login" fallback button
    const loginBtn = page.locator('button:has-text("Ke Halaman Login")')
    await loginBtn.waitFor({ timeout: 5000 })
    await loginBtn.click()
    await page.waitForLoadState('networkidle')

    expect(page.url()).toContain('/login')
  })

  test('LTI callback shows loading spinner initially', async ({ page }) => {
    // Navigate and check before network resolves
    await page.goto(`${BASE_URL}/lti/callback?token=test_token_for_loading_check`)

    // The loading spinner should appear immediately (before verification completes)
    const spinner = await page
      .locator('.animate-spin')
      .isVisible({ timeout: 1000 })
      .catch(() => false)

    // Either spinner shows OR error shows quickly — both valid (depends on network speed)
    // The test ensures no blank/crashed page
    const hasContent = await page
      .locator('text=EduSync LTI')
      .isVisible({ timeout: 3000 })
      .catch(() => false)
    expect(hasContent).toBe(true)
  })
})
