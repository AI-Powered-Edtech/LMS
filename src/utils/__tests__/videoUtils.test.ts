import { describe, expect, it } from 'vitest'

import { isEmbeddedVideo, parseVideoUrl } from '../videoUtils'

describe('parseVideoUrl', () => {
  describe('empty / invalid input', () => {
    it('returns direct type for empty string', () => {
      const result = parseVideoUrl('')
      expect(result.type).toBe('direct')
      expect(result.embedUrl).toBeNull()
    })

    it('returns direct type for invalid URL', () => {
      const result = parseVideoUrl('not-a-url')
      expect(result.type).toBe('direct')
      expect(result.embedUrl).toBeNull()
    })
  })

  describe('YouTube', () => {
    it('parses youtube.com/watch?v=VIDEO_ID', () => {
      const result = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
      expect(result.type).toBe('youtube')
      expect(result.embedUrl).toContain('youtube.com/embed/dQw4w9WgXcQ')
      expect(result.thumbnailUrl).toContain('dQw4w9WgXcQ')
    })

    it('parses youtu.be short URL', () => {
      const result = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')
      expect(result.type).toBe('youtube')
      expect(result.embedUrl).toContain('youtube.com/embed/dQw4w9WgXcQ')
    })

    it('parses youtube.com/embed/ URL', () => {
      const result = parseVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')
      expect(result.type).toBe('youtube')
      expect(result.embedUrl).toContain('youtube.com/embed/dQw4w9WgXcQ')
    })

    it('parses youtube-nocookie.com/embed/ URL', () => {
      const result = parseVideoUrl('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
      expect(result.type).toBe('youtube')
      expect(result.embedUrl).toContain('embed/dQw4w9WgXcQ')
    })

    it('includes rel=0 and modestbranding in embed URL', () => {
      const result = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')
      expect(result.embedUrl).toContain('rel=0')
      expect(result.embedUrl).toContain('modestbranding=1')
    })

    it('includes maxresdefault thumbnail', () => {
      const result = parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')
      expect(result.thumbnailUrl).toContain('maxresdefault.jpg')
    })

    it('returns direct type for youtube.com URL without valid video ID', () => {
      const result = parseVideoUrl('https://www.youtube.com/watch')
      expect(result.type).toBe('direct')
    })
  })

  describe('Vimeo', () => {
    it('parses vimeo.com/VIDEO_ID', () => {
      const result = parseVideoUrl('https://vimeo.com/123456789')
      expect(result.type).toBe('vimeo')
      expect(result.embedUrl).toBe('https://player.vimeo.com/video/123456789')
    })

    it('returns direct for vimeo.com without numeric ID', () => {
      const result = parseVideoUrl('https://vimeo.com/channels/staffpicks')
      expect(result.type).toBe('direct')
    })
  })

  describe('Direct video', () => {
    it('returns direct type for mp4 URL', () => {
      const result = parseVideoUrl('https://example.com/video.mp4')
      expect(result.type).toBe('direct')
      expect(result.embedUrl).toBeNull()
    })

    it('returns direct type for webm URL', () => {
      const result = parseVideoUrl('https://cdn.example.com/lesson.webm')
      expect(result.type).toBe('direct')
    })
  })
})

describe('isEmbeddedVideo', () => {
  it('returns true for YouTube URL', () => {
    expect(isEmbeddedVideo('https://youtu.be/dQw4w9WgXcQ')).toBe(true)
  })

  it('returns true for Vimeo URL', () => {
    expect(isEmbeddedVideo('https://vimeo.com/123456789')).toBe(true)
  })

  it('returns false for direct mp4', () => {
    expect(isEmbeddedVideo('https://example.com/video.mp4')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isEmbeddedVideo('')).toBe(false)
  })
})
