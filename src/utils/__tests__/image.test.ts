import { describe, expect, it } from 'vitest'

import { getOptimizedImageUrl } from '../image'

describe('getOptimizedImageUrl', () => {
  it('returns the original url if it is empty', () => {
    expect(getOptimizedImageUrl('')).toBe('')
  })

  it('returns the original url if it does not contain the supabase public storage path', () => {
    const nonSupabaseUrl = 'https://example.com/image.png'
    expect(getOptimizedImageUrl(nonSupabaseUrl)).toBe(nonSupabaseUrl)
  })

  it('returns the optimized url with default parameters for a valid supabase url', () => {
    const originalUrl = 'https://abc.supabase.co/storage/v1/object/public/bucket/image.png'
    const optimizedUrl = getOptimizedImageUrl(originalUrl)

    expect(optimizedUrl).toBe(
      'https://abc.supabase.co/storage/v1/render/image/public/bucket/image.png?resize=cover&quality=80&format=webp'
    )
  })

  it('applies custom width, height, resize, and quality parameters', () => {
    const originalUrl = 'https://abc.supabase.co/storage/v1/object/public/bucket/image.png'
    const optimizedUrl = getOptimizedImageUrl(originalUrl, {
      width: 100,
      height: 200,
      resize: 'contain',
      quality: 90,
    })

    expect(optimizedUrl).toBe(
      'https://abc.supabase.co/storage/v1/render/image/public/bucket/image.png?width=100&height=200&resize=contain&quality=90&format=webp'
    )
  })

  it('skips format parameter when format is "origin"', () => {
    const originalUrl = 'https://abc.supabase.co/storage/v1/object/public/bucket/image.png'
    const optimizedUrl = getOptimizedImageUrl(originalUrl, {
      format: 'origin',
    })

    expect(optimizedUrl).toBe(
      'https://abc.supabase.co/storage/v1/render/image/public/bucket/image.png?resize=cover&quality=80'
    )
  })
})
