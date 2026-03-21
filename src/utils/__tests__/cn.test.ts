import { describe, it, expect } from 'vitest'
import { cn } from '../cn'

describe('cn', () => {
  it('returns empty string for no input', () => {
    expect(cn()).toBe('')
  })

  it('returns a single class unchanged', () => {
    expect(cn('foo')).toBe('foo')
  })

  it('merges multiple classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('removes duplicates via tailwind-merge (last one wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('handles conditional classes — truthy', () => {
    expect(cn('base', true && 'active')).toBe('base active')
  })

  it('handles conditional classes — falsy', () => {
    expect(cn('base', false && 'active')).toBe('base')
  })

  it('handles undefined and null gracefully', () => {
    expect(cn('base', undefined, null as any)).toBe('base')
  })

  it('handles object syntax', () => {
    expect(cn({ 'text-red-500': true, 'text-blue-500': false })).toBe('text-red-500')
  })

  it('merges conflicting tailwind utilities (last wins)', () => {
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
  })

  it('handles array input', () => {
    expect(cn(['flex', 'items-center'])).toBe('flex items-center')
  })
})
