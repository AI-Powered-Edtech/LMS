/**
 * XAPI Statement Validator
 *
 * Validates xAPI statements before sending to ensure compliance
 * with xAPI specification and prevent server-side errors.
 */

import type { XAPIStatement, XAPIActor, XAPIVerb, XAPIObject, XAPIResult } from '../types'

export interface XAPIValidationResult {
  isValid: boolean
  errors: string[]
}

/**
 * Validate xAPI Actor
 */
function validateActor(actor: XAPIActor): string[] {
  const errors: string[] = []

  if (!actor) {
    errors.push('Actor wajib diisi')
    return errors
  }

  if (!actor.objectType || actor.objectType !== 'Agent') {
    errors.push('Actor objectType harus "Agent"')
  }

  if (!actor.mbox && !actor.account) {
    errors.push('Actor harus memiliki mbox atau account')
  }

  if (actor.mbox && !actor.mbox.startsWith('mailto:')) {
    errors.push('Actor mbox harus dimulai dengan "mailto:"')
  }

  if (actor.name && typeof actor.name !== 'string') {
    errors.push('Actor name harus berupa string')
  }

  return errors
}

/**
 * Validate xAPI Verb
 */
function validateVerb(verb: XAPIVerb): string[] {
  const errors: string[] = []

  if (!verb) {
    errors.push('Verb wajib diisi')
    return errors
  }

  if (!verb.id) {
    errors.push('Verb ID wajib diisi')
  }

  // Validate verb ID is a valid IRI
  try {
    new URL(verb.id)
  } catch {
    errors.push('Verb ID harus berupa IRI yang valid (URL)')
  }

  if (!verb.display || typeof verb.display !== 'object') {
    errors.push('Verb display wajib diisi')
  }

  return errors
}

/**
 * Validate xAPI Object
 */
function validateObject(obj: XAPIObject): string[] {
  const errors: string[] = []

  if (!obj) {
    errors.push('Object wajib diisi')
    return errors
  }

  if (!obj.objectType) {
    errors.push('Object objectType wajib diisi')
  }

  if (!obj.id) {
    errors.push('Object ID wajib diisi')
  }

  // Validate object ID is a valid IRI
  try {
    new URL(obj.id)
  } catch {
    errors.push('Object ID harus berupa IRI yang valid (URL)')
  }

  if (obj.definition) {
    if (obj.definition.name && typeof obj.definition.name !== 'string') {
      errors.push('Object definition name harus berupa string')
    }

    if (obj.definition.description && typeof obj.definition.description !== 'object') {
      errors.push('Object definition description harus berupa object')
    }
  }

  return errors
}

/**
 * Validate xAPI Result
 */
function validateResult(result?: XAPIResult): string[] {
  const errors: string[] = []

  if (!result) return errors

  if (result.score) {
    if (typeof result.score.scaled !== 'number' && result.score.scaled !== undefined) {
      errors.push('Score scaled harus berupa angka')
    }

    if (result.score.scaled !== undefined && (result.score.scaled < 0 || result.score.scaled > 1)) {
      errors.push('Score scaled harus antara 0 dan 1')
    }

    if (typeof result.score.raw !== 'number' && result.score.raw !== undefined) {
      errors.push('Score raw harus berupa angka')
    }

    if (typeof result.score.min !== 'number' && result.score.min !== undefined) {
      errors.push('Score min harus berupa angka')
    }

    if (typeof result.score.max !== 'number' && result.score.max !== undefined) {
      errors.push('Score max harus berupa angka')
    }
  }

  if (result.success !== undefined && typeof result.success !== 'boolean') {
    errors.push('Result success harus berupa boolean')
  }

  if (result.completion !== undefined && typeof result.completion !== 'boolean') {
    errors.push('Result completion harus berupa boolean')
  }

  if (result.duration) {
    // Validate ISO 8601 duration format
    const durationRegex = /^P(\d+Y)?(\d+M)?(\d+D)?(T(\d+H)?(\d+M)?(\d+S)?)?$/
    if (!durationRegex.test(result.duration)) {
      errors.push('Duration harus dalam format ISO 8601 (contoh: PT1H30M)')
    }
  }

  return errors
}

/**
 * Validate complete xAPI Statement
 */
export function validateXAPIStatement(statement: XAPIStatement): XAPIValidationResult {
  const errors: string[] = []

  // Validate required fields
  if (!statement) {
    return {
      isValid: false,
      errors: ['Statement wajib diisi'],
    }
  }

  // Validate actor
  errors.push(...validateActor(statement.actor))

  // Validate verb
  errors.push(...validateVerb(statement.verb))

  // Validate object
  errors.push(...validateObject(statement.object))

  // Validate result (optional)
  if (statement.result) {
    errors.push(...validateResult(statement.result))
  }

  // Validate timestamp
  if (statement.timestamp) {
    const timestamp = new Date(statement.timestamp)
    if (isNaN(timestamp.getTime())) {
      errors.push('Timestamp harus berupa tanggal yang valid')
    }
  }

  // Validate context (optional)
  if (statement.context) {
    if (statement.context.revision && typeof statement.context.revision !== 'string') {
      errors.push('Context revision harus berupa string')
    }

    if (statement.context.platform && typeof statement.context.platform !== 'string') {
      errors.push('Context platform harus berupa string')
    }

    if (statement.context.language && typeof statement.context.language !== 'string') {
      errors.push('Context language harus berupa string')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Create a validation error message
 */
export function getXAPIValidationErrorMessage(statement: XAPIStatement): string {
  const result = validateXAPIStatement(statement)

  if (result.isValid) {
    return ''
  }

  return `Statement xAPI tidak valid: ${result.errors.join(', ')}`
}
