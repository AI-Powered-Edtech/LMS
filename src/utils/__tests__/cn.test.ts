import { describe, expect, it } from 'vitest'

import { cn } from '@/utils/cn'

describe('cn utility', () => {
  it('merges basic class names correctly', () => {
    expect(cn('class-a', 'class-b')).toBe('class-a class-b')
  })

  it('handles conditional class objects (clsx functionality)', () => {
    expect(cn({ 'class-a': true, 'class-b': false })).toBe('class-a')
  })

  it('handles falsy values (null, undefined, false, 0, empty string)', () => {
    expect(cn('class-a', null, undefined, false, 0, '', 'class-b')).toBe('class-a class-b')
  })

  it('handles arrays of classes', () => {
    expect(cn(['class-a', 'class-b'], 'class-c')).toBe('class-a class-b class-c')
  })

  it('deduplicates and merges tailwind classes properly (twMerge functionality)', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8')
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500')
    expect(cn('px-2 py-1', 'p-4')).toBe('p-4')
  })

  it('combines conditional logic with tailwind class merging', () => {
    expect(cn('p-4 bg-red-500', { 'bg-blue-500': true, 'text-white': false })).toBe('p-4 bg-blue-500')
  })
})
