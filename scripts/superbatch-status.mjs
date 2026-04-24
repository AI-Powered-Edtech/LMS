#!/usr/bin/env node
import fs from 'node:fs'
import { execSync } from 'node:child_process'

const ROOT = process.cwd()
const PROGRESS = `${ROOT}/docs/school-os-blueprint/DAILY_PROGRESS.md`
const ROADMAP = `${ROOT}/docs/school-os-blueprint/06-roadmap.md`

function tailProgress(n = 30) {
  if (!fs.existsSync(PROGRESS)) return '(no DAILY_PROGRESS.md yet)'
  const lines = fs.readFileSync(PROGRESS, 'utf8').split(/\r?\n/)
  return lines.slice(-n).join('\n')
}

function roadmapStats() {
  if (!fs.existsSync(ROADMAP)) return { byPhase: [], total: 0, done: 0 }
  const text = fs.readFileSync(ROADMAP, 'utf8')
  const phaseRe = /^###\s+.*Fase\s+([\d.]+)\s*[—-]\s*(.+)$/gm
  const phases = []
  let m
  while ((m = phaseRe.exec(text))) {
    phases.push({ key: m[1], title: m[2].trim(), start: m.index })
  }
  for (let i = 0; i < phases.length; i++) {
    phases[i].end = i + 1 < phases.length ? phases[i + 1].start : text.length
    const slice = text.slice(phases[i].start, phases[i].end)
    const done = (slice.match(/^- \[x\]/gm) ?? []).length
    const open = (slice.match(/^- \[ \]/gm) ?? []).length
    phases[i].done = done
    phases[i].open = open
  }
  const total = phases.reduce((s, p) => s + p.done + p.open, 0)
  const done = phases.reduce((s, p) => s + p.done, 0)
  return { byPhase: phases, total, done }
}

function ghPrs() {
  try {
    const out = execSync(
      'gh pr list --author @me --state all --limit 20 --json number,title,state,mergedAt,url',
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
    return JSON.parse(out)
  } catch (err) {
    return { error: err.message.split('\n')[0] }
  }
}

const stats = roadmapStats()
const prs = ghPrs()

console.log('## Superbatch status')
console.log(`Roadmap progress: ${stats.done}/${stats.total} units complete`)
for (const p of stats.byPhase) {
  console.log(`  Fase ${p.key} ${p.title}: ${p.done} done, ${p.open} open`)
}
console.log('\n## Recent PRs (gh pr list --author @me)')
if (Array.isArray(prs)) {
  if (prs.length === 0) console.log('  (none)')
  else
    for (const pr of prs)
      console.log(`  #${pr.number} [${pr.state}] ${pr.title}${pr.mergedAt ? ` — merged ${pr.mergedAt}` : ''}`)
} else {
  console.log(`  (gh unavailable: ${prs.error})`)
}
console.log('\n## DAILY_PROGRESS tail (last 30 lines)')
console.log(tailProgress(30))
