import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { usePageTitle } from '../usePageTitle'

describe('usePageTitle', () => {
  const originalTitle = document.title

  beforeEach(() => {
    // Reset document.title before each test
    document.title = originalTitle
  })

  afterEach(() => {
    // Clean up document.title
    document.title = originalTitle
  })

  it('should set title with suffix by default', () => {
    renderHook(() => usePageTitle('Dashboard'))
    expect(document.title).toBe('Dashboard | EduSync LMS')
  })

  it('should set title without suffix when appendSuffix is false', () => {
    renderHook(() => usePageTitle('Dashboard', false))
    expect(document.title).toBe('Dashboard')
  })

  it('should use default title when title is empty and appendSuffix is true', () => {
    renderHook(() => usePageTitle('', true))
    expect(document.title).toBe('EduSync LMS')
  })

  it('should use default title when title is empty and appendSuffix is false', () => {
    renderHook(() => usePageTitle('', false))
    expect(document.title).toBe('EduSync LMS')
  })

  it('should update document.title when title prop changes', () => {
    const { rerender } = renderHook(({ title }) => usePageTitle(title), {
      initialProps: { title: 'First' },
    })

    expect(document.title).toBe('First | EduSync LMS')

    rerender({ title: 'Second' })
    expect(document.title).toBe('Second | EduSync LMS')
  })

  it('should update document.title when appendSuffix prop changes', () => {
    const { rerender } = renderHook(({ appendSuffix }) => usePageTitle('Test', appendSuffix), {
      initialProps: { appendSuffix: true },
    })

    expect(document.title).toBe('Test | EduSync LMS')

    rerender({ appendSuffix: false })
    expect(document.title).toBe('Test')
  })
})
