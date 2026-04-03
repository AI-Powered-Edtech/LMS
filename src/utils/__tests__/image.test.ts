import { describe, expect, it } from 'vitest'

import { getOptimizedImageUrl } from '../image'

describe('getOptimizedImageUrl', () => {
  it('returns original URL if it is empty', () => {
    expect(getOptimizedImageUrl('')).toBe('')
  })

  it('returns original URL if it is not a Supabase public storage URL', () => {
    const url = 'https://example.com/image.jpg'
    expect(getOptimizedImageUrl(url)).toBe(url)
  })

  it('transforms valid Supabase URL with default options', () => {
    const url = 'https://project.supabase.co/storage/v1/object/public/bucket/image.jpg'
    const result = getOptimizedImageUrl(url)

    expect(result).toContain('/storage/v1/render/image/public/bucket/image.jpg')
    expect(result).toContain('resize=cover')
    expect(result).toContain('quality=80')
    expect(result).toContain('format=webp')
    expect(result).not.toContain('width=')
    expect(result).not.toContain('height=')
  })

  it('transforms valid Supabase URL with custom options', () => {
    const url = 'https://project.supabase.co/storage/v1/object/public/bucket/image.jpg'
    const result = getOptimizedImageUrl(url, {
      width: 800,
      height: 600,
      resize: 'contain',
      quality: 90,
      format: 'origin',
    })

    expect(result).toContain('/storage/v1/render/image/public/bucket/image.jpg')
    expect(result).toContain('width=800')
    expect(result).toContain('height=600')
    expect(result).toContain('resize=contain')
    expect(result).toContain('quality=90')
    expect(result).not.toContain('format=') // Since format is 'origin', it shouldn't be included
  })
})
