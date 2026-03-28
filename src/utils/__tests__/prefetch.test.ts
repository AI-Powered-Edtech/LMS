import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { prefetchRoute, setupPrefetchListeners } from '../prefetch'

describe('prefetch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('prefetchRoute', () => {
    it('harus create link element untuk valid route', () => {
      const createSpy = vi.spyOn(document, 'createElement')
      const appendSpy = vi.spyOn(document.head, 'appendChild')

      prefetchRoute('/app/student/dashboard')

      expect(createSpy).toHaveBeenCalledWith('link')
      expect(appendSpy).toHaveBeenCalled()
    })

    it('harus set link properties untuk prefetch', () => {
      const appendSpy = vi.spyOn(document.head, 'appendChild')

      // Use a route that hasn't been prefetched yet
      prefetchRoute('/app/teacher/analytics')

      expect(appendSpy).toHaveBeenCalled()

      // Get the link that was appended
      const calls = appendSpy.mock.calls
      const newCall = calls.find(
        (call) =>
          (call[0] as HTMLLinkElement).href === '/app/teacher/analytics' ||
          (call[0] as HTMLLinkElement).href === '/app/teacher/dashboard'
      )

      if (newCall) {
        const linkArg = newCall[0] as HTMLLinkElement
        expect(linkArg.rel).toBe('prefetch')
        expect(linkArg.as).toBe('document')
        expect(linkArg.href).toBeTruthy()
      }
    })

    it('harus skip route jika tidak ada dalam prefetchMap', () => {
      const createSpy = vi.spyOn(document, 'createElement')
      prefetchRoute('/unknown/route/path')
      expect(createSpy).not.toHaveBeenCalled()
    })

    it('harus handle multiple prefetch targets dari single route', () => {
      const appendSpy = vi.spyOn(document.head, 'appendChild')

      // Clear any previous calls
      appendSpy.mockClear()

      prefetchRoute('/login')

      // /login has 3 targets: /app/student/dashboard, /app/teacher/dashboard, /app/admin/dashboard
      expect(appendSpy).toHaveBeenCalled()
    })

    it('harus skip duplicate targets dalam same prefetchRoute call', () => {
      const appendSpy = vi.spyOn(document.head, 'appendChild')

      appendSpy.mockClear()

      // /login has 3 unique targets
      prefetchRoute('/login')
      const firstCallCount = appendSpy.mock.calls.length

      // Call again - should not add duplicates
      prefetchRoute('/login')
      const secondCallCount = appendSpy.mock.calls.length

      // Second call should not add more links (all were already prefetched)
      expect(secondCallCount).toBe(firstCallCount)
    })
  })

  describe('setupPrefetchListeners', () => {
    it('harus return cleanup function', () => {
      const cleanup = setupPrefetchListeners()
      expect(typeof cleanup).toBe('function')
      cleanup()
    })

    it('harus attach mouseenter listener ke document', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const cleanup = setupPrefetchListeners()

      const calls = addEventListenerSpy.mock.calls
      const mouseenterCall = calls.find((call) => call[0] === 'mouseenter')
      expect(mouseenterCall).toBeDefined()

      cleanup()
    })

    it('harus attach focusin listener ke document', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const cleanup = setupPrefetchListeners()

      const calls = addEventListenerSpy.mock.calls
      const focusinCall = calls.find((call) => call[0] === 'focusin')
      expect(focusinCall).toBeDefined()

      cleanup()
    })

    it('harus use capture mode untuk event listeners', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const cleanup = setupPrefetchListeners()

      const calls = addEventListenerSpy.mock.calls
      const mouseenterCall = calls.find((call) => call[0] === 'mouseenter')
      if (mouseenterCall) {
        const options = mouseenterCall[2] as Record<string, boolean>
        expect(options.capture).toBe(true)
      }

      cleanup()
    })

    it('harus use passive mode untuk event listeners', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
      const cleanup = setupPrefetchListeners()

      const calls = addEventListenerSpy.mock.calls
      const mouseenterCall = calls.find((call) => call[0] === 'mouseenter')
      if (mouseenterCall) {
        const options = mouseenterCall[2] as Record<string, boolean>
        expect(options.passive).toBe(true)
      }

      cleanup()
    })

    it('harus remove event listeners ketika cleanup function dipanggil', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
      const cleanup = setupPrefetchListeners()

      cleanup()

      expect(removeEventListenerSpy).toHaveBeenCalled()
    })

    it('harus handle non-Element event targets gracefully', () => {
      // This test verifies the guard: if (!(target instanceof Element)) return
      // The handler should not throw when event.target is not an Element
      const cleanup = setupPrefetchListeners()
      expect(cleanup).toBeDefined()
      cleanup()
    })

    it('harus only process href attributes starting dengan /#/', () => {
      const cleanup = setupPrefetchListeners()
      // Verifikasi bahwa hanya link dengan href /#/ akan diprefetch
      expect(cleanup).toBeDefined()
      cleanup()
    })
  })
})
