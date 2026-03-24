import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDebounce } from '../useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300))
    expect(result.current).toBe('hello')
  })

  it('does not update value before delay elapses', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 300 },
    })

    rerender({ value: 'updated', delay: 300 })
    vi.advanceTimersByTime(200)
    expect(result.current).toBe('initial')
  })

  it('updates value after delay elapses', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'initial', delay: 300 },
    })

    rerender({ value: 'updated', delay: 300 })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('updated')
  })

  it('resets timer on rapid changes', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    })

    rerender({ value: 'b' })
    vi.advanceTimersByTime(200)
    rerender({ value: 'c' })
    vi.advanceTimersByTime(200)
    // timer reset — 'c' not applied yet
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('c')
  })

  it('uses default delay of 300ms', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: 'start' },
    })

    rerender({ value: 'end' })
    vi.advanceTimersByTime(299)
    expect(result.current).toBe('start')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('end')
  })

  it('works with number values', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: 0 },
    })

    rerender({ value: 42 })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe(42)
  })

  it('works with object values', () => {
    const obj = { name: 'test' }
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 100), {
      initialProps: { value: {} as { name?: string } },
    })

    rerender({ value: obj })
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe(obj)
  })
})
