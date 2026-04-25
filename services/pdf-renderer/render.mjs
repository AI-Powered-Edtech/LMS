#!/usr/bin/env node
/**
 * pdf-renderer — POC (Workstream E2)
 *
 * Reads `{ template, data }` JSON from stdin, writes a PDF to stdout.
 * Uses puppeteer-core against a system Chromium (set CHROMIUM_PATH or rely
 * on `which chromium`). Templates are HTML strings produced by
 * `templates/<name>.mjs`.
 *
 * Deliberately tiny: no HTTP server, no pool, no template hot-reload. The
 * Rust API server invokes this as a child process per request. We graduate
 * to a long-lived sidecar in v1 (see ADR-003).
 */

import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { renderRaporKurmerV1 } from './templates/rapor-kurmer-v1.mjs'

const TEMPLATES = {
  'rapor-kurmer-v1': renderRaporKurmerV1,
}

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
  try {
    return execSync('which chromium-browser || which chromium || which google-chrome', {
      encoding: 'utf8',
    }).trim()
  } catch {
    throw new Error('No Chromium found — set CHROMIUM_PATH')
  }
}

async function main() {
  const raw = readFileSync(0, 'utf8') // stdin
  const { template, data } = JSON.parse(raw)
  const fn = TEMPLATES[template]
  if (!fn) throw new Error(`Unknown template: ${template}`)
  const html = fn(data)

  // Lazy import — keeps the cold-start cost off cargo build hooks that call
  // this file just to verify the toolchain is present.
  const { default: puppeteer } = await import('puppeteer-core')
  const browser = await puppeteer.launch({
    executablePath: chromiumPath(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', right: '15mm', bottom: '20mm', left: '15mm' },
    })
    process.stdout.write(pdf)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(`pdf-renderer: ${err.message}`)
  process.exit(1)
})
