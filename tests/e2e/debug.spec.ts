import { test, expect } from '@playwright/test'

test('debug login page structure', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  // Take screenshot
  await page.screenshot({ path: 'login-page.png', fullPage: true })
  
  // Get page title
  const title = await page.title()
  console.log('Page title:', title)
  
  // Get all input fields
  const inputs = await page.locator('input').all()
  console.log('Number of inputs:', inputs.length)
  for (const input of inputs) {
    const type = await input.getAttribute('type')
    const placeholder = await input.getAttribute('placeholder')
    console.log('Input:', { type, placeholder })
  }
  
  // Get all buttons
  const buttons = await page.locator('button').all()
  console.log('Number of buttons:', buttons.length)
  for (const btn of buttons) {
    const text = await btn.textContent()
    console.log('Button:', text?.trim())
  }
  
  // Check URL
  console.log('Current URL:', page.url())
})
