/**
 * Runtime validation utility using Valibot.
 *
 * Provides a `safeParse` wrapper that logs validation failures in development
 * but never throws in production — instead it returns the raw data as-is
 * so the app degrades gracefully.
 */
import * as v from 'valibot'

const isDev = import.meta.env?.DEV ?? false

/**
 * Validate data against a Valibot schema.
 * - In development: logs warnings on validation failures.
 * - Always returns the input data unchanged so the app degrades gracefully.
 *
 * Overload 1: When `data` has a known type (service files), returns that
 * type unchanged — no `looseObject` intersection pollution.
 *
 * Overload 2: When `data` is `unknown` (domain mappers), returns a
 * permissive `Record` so callers can access properties.
 */
export function validate<T extends Record<string, unknown>>(
  schema: v.GenericSchema,
  data: T,
  label?: string
): T
export function validate(
  schema: v.GenericSchema,
  data: unknown,
  label?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any>
export function validate(schema: v.GenericSchema, data: unknown, label?: string): unknown {
  const result = v.safeParse(schema, data)
  if (!result.success && isDev) {
    if (import.meta.env.DEV)
      if (import.meta.env.DEV)
        console.warn(
          `[validate] ${label ?? 'unknown'}: validation failed`,
          v.flatten(result.issues)
        )
  }
  return data
}

/**
 * Validate an array of items against a schema.
 * Returns the original array unchanged; logs dev warnings per item.
 *
 * Overload 1: typed arrays (service files) — preserves element type.
 * Overload 2: unknown arrays (mappers) — returns Record[].
 */
export function validateArray<T extends Record<string, unknown>>(
  schema: v.GenericSchema,
  data: T[],
  label?: string
): T[]
export function validateArray(
  schema: v.GenericSchema,
  data: unknown[],
  label?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any>[]
export function validateArray(schema: v.GenericSchema, data: unknown[], label?: string): unknown[] {
  if (isDev) {
    data.forEach((item, i) => {
      const result = v.safeParse(schema, item)
      if (!result.success) {
        if (import.meta.env.DEV)
          if (import.meta.env.DEV)
            console.warn(
              `[validate] ${label ?? 'item'}[${i}]: validation failed`,
              v.flatten(result.issues)
            )
      }
    })
  }
  return data
}
