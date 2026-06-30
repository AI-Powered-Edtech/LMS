#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function diffSweeps(baseline, current) {
  const keyOf = (r) => `${r.persona}::${r.route}`
  const baseByKey = new Map(baseline.map((r) => [keyOf(r), r]))
  const out = []

  for (const cur of current) {
    const prev = baseByKey.get(keyOf(cur)) ?? {
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
    }
    const newConsoleErrors = cur.consoleErrors.filter((e) => !prev.consoleErrors.includes(e))
    const newPageErrors = cur.pageErrors.filter((e) => !prev.pageErrors.includes(e))
    const prevReqKey = new Set(prev.failedRequests.map((r) => `${r.url}::${r.status}`))
    const newFailedRequests = cur.failedRequests.filter((r) => !prevReqKey.has(`${r.url}::${r.status}`))

    if (newConsoleErrors.length || newPageErrors.length || newFailedRequests.length) {
      out.push({
        persona: cur.persona,
        route: cur.route,
        url: cur.url,
        newConsoleErrors,
        newPageErrors,
        newFailedRequests,
      })
    }
  }
  return out
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function main() {
  const args = process.argv.slice(2)
  const baselinePath = args[0] ?? '.qa-sweep-baseline.json'
  const currentGlob = args[1] ?? '.qa-sweep'

  if (!fs.existsSync(baselinePath)) {
    process.stderr.write(`baseline missing: ${baselinePath}\n`)
    process.exit(2)
  }
  const baseline = loadJson(baselinePath)

  const currentReports = []
  if (!fs.existsSync(currentGlob)) {
    process.stdout.write(`sweep-diff: no reports found at ${currentGlob}\n`)
    process.exit(0)
  }
  if (fs.statSync(currentGlob).isDirectory()) {
    for (const persona of fs.readdirSync(currentGlob)) {
      const reportPath = path.join(currentGlob, persona, 'report.json')
      if (fs.existsSync(reportPath)) {
        const entries = loadJson(reportPath)
        for (const e of entries) currentReports.push({ persona, ...e })
      }
    }
  } else {
    currentReports.push(...loadJson(currentGlob))
  }

  const diff = diffSweeps(baseline, currentReports)
  if (diff.length === 0) {
    process.stdout.write('sweep-diff: no regressions\n')
    process.exit(0)
  }
  for (const d of diff) {
    process.stderr.write(
      `REGRESSION ${d.persona}/${d.route}: +console=${d.newConsoleErrors.length} +page=${d.newPageErrors.length} +req=${d.newFailedRequests.length}\n`,
    )
  }
  process.exit(1)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
