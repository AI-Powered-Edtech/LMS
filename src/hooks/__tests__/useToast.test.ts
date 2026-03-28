import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from '@testing-library/react'
import { useToast } from '../useToast'

// useToast is a Zustand store — import gives us the hook directly.
// Between tests we reset store state by clearing all toasts.

function getState() {
  return useToast.getState()
}

describe('useToast', () => {
  beforeEach(() => {
    // Reset store to empty state between tests
    act(() => {
      getState().toasts.forEach((t) => getState().removeToast(t.id))
    })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    // Ensure store is cleaned up
    act(() => {
      getState().toasts.forEach((t) => getState().removeToast(t.id))
    })
  })

  // D2-T1: addToast appends to the queue
  it('addToast adds a toast to the queue', () => {
    act(() => {
      getState().addToast({ type: 'success', message: 'Berhasil disimpan' })
    })

    expect(getState().toasts).toHaveLength(1)
    expect(getState().toasts[0].message).toBe('Berhasil disimpan')
    expect(getState().toasts[0].type).toBe('success')
    expect(getState().toasts[0].id).toBeTruthy()
  })

  // D2-T2: removeToast removes by id
  it('removeToast removes the toast with matching id', () => {
    act(() => {
      getState().addToast({ type: 'info', message: 'Informasi' })
    })

    const id = getState().toasts[0].id

    act(() => {
      getState().removeToast(id)
    })

    expect(getState().toasts).toHaveLength(0)
  })

  // D2-T3: auto-dismiss fires after default 5000ms
  it('auto-dismisses toast after 5000ms', () => {
    act(() => {
      getState().addToast({ type: 'warning', message: 'Peringatan' })
    })

    expect(getState().toasts).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(getState().toasts).toHaveLength(0)
  })

  // D2-T4: custom duration overrides the default
  it('auto-dismisses after custom duration when provided', () => {
    act(() => {
      getState().addToast({ type: 'error', message: 'Kesalahan', duration: 2000 })
    })

    // Should still be present at 1999ms
    act(() => {
      vi.advanceTimersByTime(1999)
    })
    expect(getState().toasts).toHaveLength(1)

    // Should be gone after 2000ms
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(getState().toasts).toHaveLength(0)
  })

  // D2-T5: toast with action property is stored correctly
  it('stores action property on the toast object', () => {
    const onClick = vi.fn()

    act(() => {
      getState().addToast({
        type: 'info',
        message: 'Dengan aksi',
        action: { label: 'Batal', onClick },
      })
    })

    const toast = getState().toasts[0]
    expect(toast.action).toBeDefined()
    expect(toast.action!.label).toBe('Batal')
    expect(toast.action!.onClick).toBe(onClick)
  })

  // D2-T6: MAX_TOASTS cap — oldest toast is evicted
  it('evicts oldest toast when MAX_TOASTS (3) is exceeded', () => {
    act(() => {
      getState().addToast({ type: 'success', message: 'Toast 1' })
      getState().addToast({ type: 'success', message: 'Toast 2' })
      getState().addToast({ type: 'success', message: 'Toast 3' })
      // This should evict Toast 1
      getState().addToast({ type: 'success', message: 'Toast 4' })
    })

    const messages = getState().toasts.map((t) => t.message)
    expect(messages).not.toContain('Toast 1')
    expect(messages).toContain('Toast 4')
    expect(getState().toasts).toHaveLength(3)
  })
})
