/**
 * xAPI Statement Validator
 * Validates xAPI statements against EduSync's simplified xAPI schema.
 *
 * EduSync uses flattened types (string verbs, numeric scores) rather than
 * full xAPI spec objects (with verb.id/verb.display, score.scaled, etc.).
 * This validator enforces those constraints.
 */

import type { XAPIContext, XAPIObjectType, XAPIResult, XAPIStatement, XAPIVerb } from '../types'

// Valid verb values
const VALID_VERBS: readonly string[] = [
  'experienced',
  'completed',
  'attempted',
  'scored',
  'passed',
  'failed',
  'launched',
  'submitted',
] satisfies XAPIVerb[]

// Valid object types
const VALID_OBJECT_TYPES: readonly string[] = [
  'lesson',
  'quiz',
  'assignment',
  'course',
  'block',
] satisfies XAPIObjectType[]

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Validates an xAPI verb string.
 * EduSync verbs are plain string literals, not objects with id/display.
 */
export function validateVerb(verb: unknown): ValidationError[] {
  const errors: ValidationError[] = []

  if (typeof verb !== 'string') {
    errors.push({ field: 'verb', message: 'Verb must be a string' })
    return errors
  }

  if (!VALID_VERBS.includes(verb)) {
    errors.push({
      field: 'verb',
      message: `Invalid verb "${verb}". Must be one of: ${VALID_VERBS.join(', ')}`,
    })
  }

  return errors
}

/**
 * Validates an xAPI object type string.
 */
export function validateObjectType(objectType: unknown): ValidationError[] {
  const errors: ValidationError[] = []

  if (typeof objectType !== 'string') {
    errors.push({ field: 'object_type', message: 'Object type must be a string' })
    return errors
  }

  if (!VALID_OBJECT_TYPES.includes(objectType)) {
    errors.push({
      field: 'object_type',
      message: `Invalid object type "${objectType}". Must be one of: ${VALID_OBJECT_TYPES.join(', ')}`,
    })
  }

  return errors
}

/**
 * Validates an xAPI result object.
 * EduSync uses a flat score (number), not nested score.scaled/raw/min/max.
 */
export function validateResult(result: unknown): ValidationError[] {
  const errors: ValidationError[] = []

  if (result === null || result === undefined) {
    return errors // Result is optional
  }

  if (typeof result !== 'object') {
    errors.push({ field: 'result', message: 'Result must be an object' })
    return errors
  }

  const r = result as XAPIResult

  if (r.score !== undefined) {
    if (typeof r.score !== 'number') {
      errors.push({ field: 'result.score', message: 'Score must be a number' })
    } else if (r.score < 0 || r.score > 100) {
      errors.push({ field: 'result.score', message: 'Score must be between 0 and 100' })
    }
  }

  if (r.success !== undefined && typeof r.success !== 'boolean') {
    errors.push({ field: 'result.success', message: 'Success must be a boolean' })
  }

  if (r.completion !== undefined && typeof r.completion !== 'boolean') {
    errors.push({ field: 'result.completion', message: 'Completion must be a boolean' })
  }

  if (r.duration !== undefined) {
    if (typeof r.duration !== 'number') {
      errors.push({ field: 'result.duration', message: 'Duration must be a number' })
    } else if (r.duration < 0) {
      errors.push({ field: 'result.duration', message: 'Duration must be non-negative' })
    }
  }

  return errors
}

/**
 * Validates an xAPI context object.
 * EduSync context uses course_id, module_id, lesson_id, tenant_id, platform.
 * Does NOT include revision or language (those are full xAPI spec fields).
 */
export function validateContext(context: unknown): ValidationError[] {
  const errors: ValidationError[] = []

  if (context === null || context === undefined) {
    return errors // Context is optional
  }

  if (typeof context !== 'object') {
    errors.push({ field: 'context', message: 'Context must be an object' })
    return errors
  }

  const c = context as XAPIContext

  if (c.course_id !== undefined && typeof c.course_id !== 'string') {
    errors.push({ field: 'context.course_id', message: 'course_id must be a string' })
  }

  if (c.module_id !== undefined && typeof c.module_id !== 'string') {
    errors.push({ field: 'context.module_id', message: 'module_id must be a string' })
  }

  if (c.lesson_id !== undefined && typeof c.lesson_id !== 'string') {
    errors.push({ field: 'context.lesson_id', message: 'lesson_id must be a string' })
  }

  if (c.tenant_id !== undefined && typeof c.tenant_id !== 'string') {
    errors.push({ field: 'context.tenant_id', message: 'tenant_id must be a string' })
  }

  if (c.platform !== undefined && typeof c.platform !== 'string') {
    errors.push({ field: 'context.platform', message: 'platform must be a string' })
  }

  return errors
}

/**
 * Validates a complete xAPI statement.
 * Uses EduSync's flattened schema: actor_id (not actor), object_type/object_id (not object).
 */
export function validateStatement(statement: unknown): ValidationResult {
  const errors: ValidationError[] = []

  if (!statement || typeof statement !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'statement', message: 'Statement must be an object' }],
    }
  }

  const s = statement as Record<string, unknown>

  // Required: actor_id (EduSync uses actor_id, not nested actor object)
  if (!s.actor_id || typeof s.actor_id !== 'string') {
    errors.push({ field: 'actor_id', message: 'actor_id is required and must be a string (UUID)' })
  }

  // Required: verb (string literal, not object)
  errors.push(...validateVerb(s.verb))

  // Required: object_type (EduSync uses object_type, not nested object)
  errors.push(...validateObjectType(s.object_type))

  // Required: object_id
  if (!s.object_id || typeof s.object_id !== 'string') {
    errors.push({
      field: 'object_id',
      message: 'object_id is required and must be a string (UUID)',
    })
  }

  // Optional: result
  errors.push(...validateResult(s.result))

  // Optional: context
  errors.push(...validateContext(s.context))

  // Optional: timestamp (ISO 8601)
  if (s.timestamp !== undefined) {
    if (typeof s.timestamp !== 'string' || isNaN(Date.parse(String(s.timestamp)))) {
      errors.push({ field: 'timestamp', message: 'timestamp must be a valid ISO 8601 date string' })
    }
  }

  // Optional: tenant_id
  if (s.tenant_id !== undefined && typeof s.tenant_id !== 'string') {
    errors.push({ field: 'tenant_id', message: 'tenant_id must be a string (UUID)' })
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Type guard for XAPIStatement.
 */
export function isValidStatement(statement: unknown): statement is XAPIStatement {
  return validateStatement(statement).valid
}
