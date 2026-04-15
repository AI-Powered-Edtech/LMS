#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const scopedPrefixes = [
  'src/services/api/',
  'src/services/auth/',
  'src/features/courses/',
  'src/features/gradebook/',
]

const result = spawnSync('pnpm', ['exec', 'tsc', '--noEmit', '--pretty', 'false'], {
  cwd: process.cwd(),
  encoding: 'utf-8',
})

const combinedOutput = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
const scopedLines = combinedOutput
  .split('\n')
  .filter(
    (line) =>
      scopedPrefixes.some((prefix) => line.includes(prefix)) && !line.includes('/__tests__/')
  )

if (scopedLines.length > 0) {
  console.error(scopedLines.join('\n'))
  process.exit(1)
}

if (result.status && result.status !== 0) {
  console.log(
    'typecheck:migration-gate lulus untuk scope migration. Error TypeScript di luar scope diabaikan.'
  )
  process.exit(0)
}

console.log('typecheck:migration-gate lulus.')
