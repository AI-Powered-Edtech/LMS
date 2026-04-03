import { test, expect } from '@playwright/test'
import { skipIfNoAuth } from '../helpers'

// ============================================================================
// Invite Token Security — E2E Tests
// ============================================================================
// Memastikan invite token dan join code ditangani dengan aman:
// - Malformed input tidak menyebabkan crash
// - XSS payloads tidak dieksekusi
// - Token invalid/expired/used/different-tenant tidak menyebabkan enrollment diam-diam
// ============================================================================

const BASE = 'http://localhost:5173'

// ============================================================================
// Test Group 1: Malformed token — client-side guard
// ============================================================================
test.describe('Invite Token — Malformed Input Handling', () => {
  test('empty token after trailing slash does not crash', async ({ page }) => {
    await page.goto(`${BASE}/#/invite/`)
    await page.waitForLoadState('networkidle')

    // Halaman harus tetap render sesuatu, tidak crash total
    await expect(page.locator('body')).not.toBeEmpty()
    // Tidak ada title error yang menunjukkan unhandled crash
    await expect(page).not.toHaveTitle(/error/i)
  })

  test('URL-encoded XSS payload does not execute', async ({ page }) => {
    let alertFired = false
    page.on('dialog', () => {
      alertFired = true
    })

    await page.goto(`${BASE}/#/invite/%3Cscript%3Ealert(1)%3C%2Fscript%3E`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Tidak ada alert/dialog yang muncul
    expect(alertFired).toBe(false)
    // Halaman tetap render tanpa crash
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('path traversal attempt handled gracefully', async ({ page }) => {
    await page.goto(`${BASE}/#/invite/../../../../etc/passwd`)
    await page.waitForLoadState('networkidle')

    // Halaman harus handle path traversal dengan graceful
    await expect(page.locator('body')).not.toBeEmpty()
    await expect(page).not.toHaveTitle(/error/i)
  })
})

// ============================================================================
// Test Group 2: Invalid join code — client-side
// ============================================================================
test.describe('Join Code — Invalid Input Handling', () => {
  test('join page without code parameter renders without crash', async ({ page }) => {
    await page.goto(`${BASE}/#/join`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).not.toBeEmpty()
    await expect(page).not.toHaveTitle(/error/i)
  })

  test('join page with empty code param renders without crash', async ({ page }) => {
    await page.goto(`${BASE}/#/join?code=`)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('join page with XSS code param does not execute script', async ({ page }) => {
    let alertFired = false
    page.on('dialog', () => {
      alertFired = true
    })

    await page.goto(`${BASE}/#/join?code=<script>alert(1)</script>`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    expect(alertFired).toBe(false)
    await expect(page.locator('body')).not.toBeEmpty()
  })
})

// ============================================================================
// Test Group 3: Expired/invalid token — API error handling
// ============================================================================
// Membutuhkan backend nyata untuk validasi token
test.describe('Invite Token — Expired/Invalid API Response', () => {
  test('non-existent token shows error and does not silently enroll', async ({ page }) => {
    skipIfNoAuth()
    test.setTimeout(15000)

    await page.goto(`${BASE}/#/invite/this-token-does-not-exist-00000000`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    const url = page.url()

    // Pastikan TIDAK ter-redirect ke dashboard (artinya tidak enroll diam-diam)
    expect(url).not.toMatch(/\/app\/student\/dashboard/)
    expect(url).not.toMatch(/\/app\/teacher\/dashboard/)

    // Harus ada indikasi error: alert role, class merah, aria-live, atau pesan error
    const hasAlertRole = await page
      .locator('[role="alert"]')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
    const hasRedText = await page
      .locator('.text-red-500, .text-red-600, .text-red-700')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
    const hasAriaLive = await page
      .locator('[aria-live="polite"]')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
    const hasErrorText = await page
      .locator('text=/tidak valid|gagal|error|invalid/i')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)

    expect(hasAlertRole || hasRedText || hasAriaLive || hasErrorText).toBeTruthy()
  })
})

// ============================================================================
// Test Group 4: Already-used token
// ============================================================================
test.describe('Invite Token — Already Used', () => {
  test('already-used token shows error and does not enroll', async ({ page }) => {
    skipIfNoAuth()
    test.setTimeout(15000)

    await page.goto(`${BASE}/#/invite/already-used-token-000000000000`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    const url = page.url()

    // Pastikan TIDAK ter-redirect ke dashboard
    expect(url).not.toMatch(/\/app\/student\/dashboard/)
    expect(url).not.toMatch(/\/app\/teacher\/dashboard/)

    // Harus ada indikasi error
    const hasAlertRole = await page
      .locator('[role="alert"]')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
    const hasRedText = await page
      .locator('.text-red-500, .text-red-600, .text-red-700')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
    const hasAriaLive = await page
      .locator('[aria-live="polite"]')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)
    const hasErrorText = await page
      .locator('text=/tidak valid|gagal|error|sudah digunakan|already used/i')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)

    expect(hasAlertRole || hasRedText || hasAriaLive || hasErrorText).toBeTruthy()
  })
})

// ============================================================================
// Test Group 5: Token from different tenant
// ============================================================================
test.describe('Join Code — Cross-Tenant Isolation', () => {
  test('wrong tenant code does not enroll in any class', async ({ page }) => {
    skipIfNoAuth()
    test.setTimeout(15000)

    await page.goto(`${BASE}/#/join?code=WRONG_TENANT_999`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    const url = page.url()

    // Pastikan TIDAK berhasil enroll ke dashboard manapun
    expect(url).not.toMatch(/\/app\/student\/dashboard/)
    expect(url).not.toMatch(/\/app\/teacher\/dashboard/)
    expect(url).not.toMatch(/\/app\/admin/)

    // Harus ada indikasi error atau tetap di halaman join
    const isStillOnJoin = url.includes('join')
    const hasErrorText = await page
      .locator('text=/tidak valid|gagal|error|tidak ditemukan|tenant/i')
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false)

    expect(isStillOnJoin || hasErrorText).toBeTruthy()
  })
})
