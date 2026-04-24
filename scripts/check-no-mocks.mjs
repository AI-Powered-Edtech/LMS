#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOTS = ['src', 'tests']
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.qa-sweep'])

const ALLOWLIST = new Set([
])

const PATTERNS = [
  { name: 'vi.mock', re: /\bvi\.mock\s*\(/ },
  { name: 'page.route', re: /\bpage\.route\s*\(/ },
  { name: 'msw import', re: /from\s+['"]msw['"]/ },
  { name: 'setupServer', re: /\bsetupServer\s*\(/ },
]

function* walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (/\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/.test(entry.name)) yield full
  }
}

const offenders = []
for (const root of ROOTS) {
  for (const file of walk(root)) {
    if (ALLOWLIST.has(file)) continue
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
    lines.forEach((line, i) => {
      for (const { name, re } of PATTERNS) {
        if (re.test(line)) offenders.push({ file, line: i + 1, pattern: name, snippet: line.trim() })
      }
    })
  }
}

if (offenders.length === 0) {
  process.stdout.write('check-no-mocks: clean\n')
  process.exit(0)
}
for (const o of offenders) {
  process.stderr.write(`${o.file}:${o.line}  [${o.pattern}]  ${o.snippet}\n`)
}
process.stderr.write(`\nBLOCKED: ${offenders.length} mock pattern(s) detected. See requirements.md §4.\n`)
process.exit(1)
