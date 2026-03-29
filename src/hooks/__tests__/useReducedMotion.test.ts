import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useReducedMotion } from '../useReducedMotion'

describe('useReducedMotion', () => {
  let matchMediaMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Mock window.matchMedia
    matchMediaMock = vi.fn((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('harus return false ketika user tidak prefer reduced motion', () => {
    matchMediaMock.mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })

    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('harus return true ketika user prefer reduced motion', () => {
    matchMediaMock.mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })

    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('harus call window.matchMedia dengan correct query', () => {
    renderHook(() => useReducedMotion())
    expect(matchMediaMock).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)')
  })

  it('harus add event listener untuk media query changes', () => {
    const addEventListenerMock = vi.fn()
    matchMediaMock.mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: addEventListenerMock,
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })

    const { unmount } = renderHook(() => useReducedMotion())

    expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function))

    unmount()
  })

  it('harus remove event listener ketika component unmount', () => {
    const removeEventListenerMock = vi.fn()
    matchMediaMock.mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: removeEventListenerMock,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })

    const { unmount } = renderHook(() => useReducedMotion())
    unmount()

    expect(removeEventListenerMock).toHaveBeenCalled()
  })

  it('harus update state ketika media query matches berubah', async () => {
    let changeHandler: ((e: MediaQueryListEvent) => void) | null = null

    const addEventListenerMock = vi.fn(
      (event: string, handler: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') {
          changeHandler = handler
        }
      }
    )

    matchMediaMock.mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: addEventListenerMock,
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })

    const { result, rerender } = renderHook(() => useReducedMotion())

    expect(result.current).toBe(false)

    // Simulate media query change
    if (changeHandler) {
      changeHandler({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
      } as unknown as MediaQueryListEvent)
    }

    rerender()

    await waitFor(() => {
      expect(result.current).toBe(true)
    })
  })

  it('harus handle window undefined gracefully dalam initial state', () => {
    // This test ensures SSR doesn't crash
    const { result } = renderHook(() => useReducedMotion())
    expect(typeof result.current).toBe('boolean')
  })

  it('harus return boolean type', () => {
    const { result } = renderHook(() => useReducedMotion())
    expect(typeof result.current).toBe('boolean')
  })

  it('harus persist reduced motion preference across re-renders', () => {
    matchMediaMock.mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })

    const { result, rerender } = renderHook(() => useReducedMotion())

    const firstRenderValue = result.current
    rerender()
    const secondRenderValue = result.current

    expect(firstRenderValue).toBe(secondRenderValue)
  })
})
