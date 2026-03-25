// ==========================================================================
// SCORM Data Model — scormDataModel.ts
//
// SCORM CMI data store, time parsing/formatting, payload extraction,
// and read-only element definitions.
// Extracted from scormApiBridge.ts for modularity.
// ==========================================================================

import type { ScormCommitPayload } from './scormApiBridge'

// ── CMI Data Store ─────────────────────────────────────────────

export class CmiDataStore {
  private data: Record<string, string>

  constructor(initialData: Record<string, string> = {}) {
    this.data = { ...initialData }
  }

  get(key: string): string | undefined {
    return this.data[key]
  }

  set(key: string, value: string): void {
    this.data[key] = value
  }

  getAll(): Record<string, string> {
    return { ...this.data }
  }
}

// ── Time Parsing ───────────────────────────────────────────────

/**
 * Parse SCORM 1.2 time format (HH:MM:SS.SS) to seconds.
 */
export function parseScorm12Time(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  if (parts.length !== 3) return 0
  const hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0
  const seconds = parseFloat(parts[2]) || 0
  return hours * 3600 + minutes * 60 + Math.round(seconds)
}

/**
 * Parse SCORM 2004 time format (ISO 8601 duration: PT1H30M20S) to seconds.
 */
export function parseScorm2004Time(timeStr: string): number {
  if (!timeStr) return 0
  const match = timeStr.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?$/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseFloat(match[3] || '0')
  return hours * 3600 + minutes * 60 + Math.round(seconds)
}

/**
 * Format seconds as SCORM 1.2 time (HH:MM:SS).
 */
export function formatScorm12Time(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Format seconds as SCORM 2004 ISO 8601 duration.
 */
export function formatScorm2004Time(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  let result = 'PT'
  if (hours > 0) result += `${hours}H`
  if (minutes > 0) result += `${minutes}M`
  result += `${seconds}S`
  return result
}

// ── Extract Payload ────────────────────────────────────────────

export function extractPayload(store: CmiDataStore, version: '1.2' | '2004'): ScormCommitPayload {
  const data = store.getAll()

  let scoreRaw: number | null = null
  let scoreMax: number | null = null
  let lessonStatus = 'incomplete'
  let totalTimeSeconds = 0
  let suspendData: string | null = null

  if (version === '1.2') {
    const rawStr = data['cmi.core.score.raw']
    if (rawStr !== undefined && rawStr !== '') scoreRaw = parseFloat(rawStr)

    const maxStr = data['cmi.core.score.max']
    if (maxStr !== undefined && maxStr !== '') scoreMax = parseFloat(maxStr)

    lessonStatus = data['cmi.core.lesson_status'] || 'incomplete'
    totalTimeSeconds = parseScorm12Time(data['cmi.core.total_time'] || '')
    suspendData = data['cmi.suspend_data'] ?? null

    // Also accumulate session_time
    const sessionTime = data['cmi.core.session_time']
    if (sessionTime) {
      totalTimeSeconds += parseScorm12Time(sessionTime)
    }
  } else {
    // SCORM 2004
    const rawStr = data['cmi.score.raw']
    if (rawStr !== undefined && rawStr !== '') scoreRaw = parseFloat(rawStr)

    const maxStr = data['cmi.score.max']
    if (maxStr !== undefined && maxStr !== '') scoreMax = parseFloat(maxStr)

    const completionStatus = data['cmi.completion_status'] || 'incomplete'
    const successStatus = data['cmi.success_status'] || 'unknown'

    // Map SCORM 2004 dual-status to a single status
    if (completionStatus === 'completed' && successStatus === 'passed') {
      lessonStatus = 'passed'
    } else if (completionStatus === 'completed' && successStatus === 'failed') {
      lessonStatus = 'failed'
    } else if (completionStatus === 'completed') {
      lessonStatus = 'completed'
    } else if (successStatus === 'failed') {
      lessonStatus = 'failed'
    } else {
      lessonStatus = 'incomplete'
    }

    totalTimeSeconds = parseScorm2004Time(data['cmi.total_time'] || '')
    suspendData = data['cmi.suspend_data'] ?? null

    const sessionTime = data['cmi.session_time']
    if (sessionTime) {
      totalTimeSeconds += parseScorm2004Time(sessionTime)
    }
  }

  return {
    cmiData: data,
    scoreRaw,
    scoreMax,
    lessonStatus,
    totalTimeSeconds,
    suspendData,
  }
}

// ── Read-only CMI Elements ─────────────────────────────────────

export const READ_ONLY_12 = new Set([
  'cmi.core._children',
  'cmi.core.student_id',
  'cmi.core.student_name',
  'cmi.core.credit',
  'cmi.core.entry',
  'cmi.core.total_time',
  'cmi.core.score._children',
  'cmi.launch_data',
  'cmi.comments_from_lms',
  'cmi.student_data._children',
  'cmi.student_data.mastery_score',
  'cmi.student_data.max_time_allowed',
  'cmi.student_data.time_limit_action',
])

export const READ_ONLY_2004 = new Set([
  'cmi._version',
  'cmi.completion_threshold',
  'cmi.credit',
  'cmi.entry',
  'cmi.launch_data',
  'cmi.learner_id',
  'cmi.learner_name',
  'cmi.max_time_allowed',
  'cmi.mode',
  'cmi.scaled_passing_score',
  'cmi.time_limit_action',
  'cmi.total_time',
])
