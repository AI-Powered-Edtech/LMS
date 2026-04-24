#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const PROGRESS = path.resolve('docs/school-os-blueprint/DAILY_PROGRESS.md')

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--prio') out.prio = argv[++i]
    else if (a === '--unit') out.unit = argv[++i]
    else if (a === '--gate') out.gate = argv[++i]
    else if (a === '--cmd') out.cmd = argv[++i]
    else if (a === '--note') out.note = argv[++i]
    else if (a === '-h' || a === '--help') out.help = true
  }
  return out
}

function usage() {
  console.log(
    'Usage: node scripts/superbatch-handoff.mjs --prio N --unit M --gate K --cmd "<exact command>" [--note "..."]',
  )
}

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

function hhmm(d = new Date()) {
  return d.toTimeString().slice(0, 5)
}

function appendHeartbeat({ prio, unit, gate }) {
  const today = isoDate()
  const line = `- ${hhmm()} — Heartbeat — awaiting operator gate ${gate} (Prio ${prio} Unit ${unit})`
  let body = ''
  if (fs.existsSync(PROGRESS)) body = fs.readFileSync(PROGRESS, 'utf8')
  const lines = body.split('\n')
  const headingIdx = lines.findIndex((l) => l === `## ${today}`)
  if (headingIdx === -1) {
    const sep = body.endsWith('\n') ? '' : '\n'
    fs.appendFileSync(PROGRESS, `${sep}\n## ${today}\n${line}\n`)
    return
  }
  let insertAt = lines.length
  for (let i = headingIdx + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      insertAt = i
      break
    }
  }
  while (insertAt > headingIdx + 1 && lines[insertAt - 1].trim() === '') insertAt--
  lines.splice(insertAt, 0, line)
  fs.writeFileSync(PROGRESS, lines.join('\n'))
}

const args = parseArgs(process.argv.slice(2))
if (args.help || !args.prio || !args.unit || !args.gate || !args.cmd) {
  usage()
  process.exit(args.help ? 0 : 1)
}

const block = [
  '',
  `HANDOFF — Prio ${args.prio} Unit ${args.unit} — Gate ${args.gate}`,
  args.note ? `Context: ${args.note}` : null,
  'Run in your terminal:',
  `  ${args.cmd}`,
  'Paste the output (or last 50 lines + exit code) back to me.',
  'I will not mark this gate passed without your output.',
  '',
]
  .filter((x) => x !== null)
  .join('\n')

process.stdout.write(block)
appendHeartbeat(args)
