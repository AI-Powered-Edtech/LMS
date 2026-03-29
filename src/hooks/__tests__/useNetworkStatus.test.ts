import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkStatus } from '../useNetworkStatus'

describe('useNetworkStatus', () => {
  beforeEach(() => {
    // Default: online
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true })
  })

  // D3-T1: returns online when navigator.onLine = true
  it('reports isOnline true when navigator.onLine is true', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })

    const { result } = renderHook(() => useNetworkStatus())

    expect(result.current.isOnline).toBe(true)
  })

  // D3-T2: returns offline when navigator.onLine = false
  it('reports isOnline false when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    const { result } = renderHook(() => useNetworkStatus())

    expect(result.current.isOnline).toBe(false)
  })

  // D3-T3: fires offline event -> isOnline becomes false
  it('sets isOnline to false when window fires offline event', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })

    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current.isOnline).toBe(true)

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })

    expect(result.current.isOnline).toBe(false)
  })

  // D3-T4: fires online event -> isOnline becomes true and wasOffline set
  it('sets isOnline to true and wasOffline to true when window fires online event', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    const { result } = renderHook(() => useNetworkStatus())
    expect(result.current.isOnline).toBe(false)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })

    expect(result.current.isOnline).toBe(true)
    expect(result.current.wasOffline).toBe(true)
  })

  // D3-T5: cleans up listeners on unmount
  it('removes event listeners on unmount', () => {
    // Set up spy BEFORE render so it captures the addEventListener calls
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useNetworkStatus())

    // Capture the exact handler functions that were registered
    const onlineCalls = addSpy.mock.calls.filter((c) => c[0] === 'online')
    const offlineCalls = addSpy.mock.calls.filter((c) => c[0] === 'offline')

    unmount()

    // Verify those exact handlers were removed
    const removedOnline = removeSpy.mock.calls.filter((c) => c[0] === 'online')
    const removedOffline = removeSpy.mock.calls.filter((c) => c[0] === 'offline')

    expect(onlineCalls.length).toBeGreaterThan(0)
    expect(offlineCalls.length).toBeGreaterThan(0)
    expect(removedOnline.length).toBeGreaterThan(0)
    expect(removedOffline.length).toBeGreaterThan(0)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  // D3-T6: resetWasOffline resets the flag to false
  it('resets wasOffline via resetWasOffline()', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    const { result } = renderHook(() => useNetworkStatus())

    // Trigger online to set wasOffline = true
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current.wasOffline).toBe(true)

    act(() => {
      result.current.resetWasOffline()
    })

    expect(result.current.wasOffline).toBe(false)
  })
})
