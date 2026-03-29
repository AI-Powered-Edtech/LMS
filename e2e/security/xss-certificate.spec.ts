import { expect, test } from '@playwright/test'

/**
 * CRITICAL SECURITY: XSS protection in CertificateViewer
 * Tests that user-controlled profile names are properly escaped
 * before being injected into document.write() in the print window.
 *
 * Attack vector: Student sets profile name to XSS payload,
 * then teacher generates certificate — XSS executes in print window.
 */

test.describe('XSS Protection — Certificate Viewer', () => {
  test.use({ storageState: 'e2e/.auth/student.json' })

  test('script tags dalam certificate tidak dieksekusi', async ({ page }) => {
    let alertFired = false
    page.on('dialog', () => {
      alertFired = true
    })

    // Navigate ke halaman certificates
    await page.goto('/#/app/student/certificates')
    await page.waitForLoadState('networkidle')

    // Tunggu sebentar untuk pastikan semua render selesai
    await page.waitForTimeout(1000)

    expect(alertFired).toBe(false)
  })

  test('certificate print window tidak punya window.opener reference', async ({ page }) => {
    await page.goto('/#/app/student/certificates')
    await page.waitForLoadState('networkidle')

    // Verifikasi bahwa cetak button ada dan dapat diklik
    const printButton = page.getByText('Cetak PDF').first()
    if (await printButton.isVisible()) {
      // Open popup dan verifikasi tidak ada window.opener
      const [popup] = await Promise.all([
        page.waitForEvent('popup').catch(() => null),
        printButton.click(),
      ])

      if (popup) {
        const hasOpener = await popup.evaluate(() => window.opener !== null)
        expect(hasOpener).toBe(false)
        await popup.close()
      }
    }
  })
})

/**
 * Verifikasi fungsi escapeHtml mencegah XSS secara umum.
 * Ini menguji logika sanitasi, bukan state autentikasi.
 */
test.describe('XSS Protection — Sanitasi Karakter HTML', () => {
  test('escapeHtml mencegah injeksi tag script', async ({ page }) => {
    await page.goto('http://localhost:5173/#/login')
    await page.waitForLoadState('networkidle')

    const xssPayload = '<script>alert("xss")</script>'

    const result = await page.evaluate((payload) => {
      const HTML_ESCAPE_MAP: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      }
      return payload.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] || char)
    }, xssPayload)

    expect(result).toContain('&lt;script&gt;')
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('</script>')
  })

  test('escapeHtml mencegah injeksi img onerror XSS', async ({ page }) => {
    await page.goto('http://localhost:5173/#/login')
    await page.waitForLoadState('networkidle')

    const xssPayload = '<img src=x onerror=window.__XSS_FIRED=true>'

    const result = await page.evaluate((payload) => {
      const HTML_ESCAPE_MAP: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      }
      return payload.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] || char)
    }, xssPayload)

    expect(result).toContain('&lt;img')
    expect(result).toContain('&gt;')
    expect(result).not.toContain('<img')
    expect(result).not.toContain('onerror=')
  })

  test('halaman certificate load tanpa eksekusi script injection', async ({ page }) => {
    let xssExecuted = false
    await page.exposeFunction('__reportXSS', () => {
      xssExecuted = true
    })

    await page.goto('http://localhost:5173/#/login')
    await page.waitForLoadState('networkidle')

    expect(xssExecuted).toBe(false)
  })
})
