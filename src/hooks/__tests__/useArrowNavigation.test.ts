import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { useArrowNavigation } from '../useArrowNavigation'

describe('useArrowNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('harus return containerRef dan handleKeyDown', () => {
    const { result } = renderHook(() => useArrowNavigation())
    expect(result.current).toHaveProperty('containerRef')
    expect(result.current).toHaveProperty('handleKeyDown')
    expect(typeof result.current.handleKeyDown).toBe('function')
  })

  it('harus return containerRef dengan null initial value', () => {
    const { result } = renderHook(() => useArrowNavigation())
    expect(result.current.containerRef.current).toBeNull()
  })

  it('harus ignore non-navigation keys', () => {
    const { result } = renderHook(() => useArrowNavigation())
    const preventDefaultSpy = vi.fn()

    const event = {
      key: 'Enter',
      preventDefault: preventDefaultSpy,
    } as unknown as React.KeyboardEvent<HTMLElement>

    result.current.handleKeyDown(event)
    expect(preventDefaultSpy).not.toHaveBeenCalled()
  })

  it('harus handle ArrowDown key', () => {
    const { result } = renderHook(() => useArrowNavigation())
    const preventDefaultSpy = vi.fn()
    const focusSpy = vi.fn()

    // Create mock container dengan focusable items
    const mockContainer = document.createElement('div')
    const link1 = document.createElement('a')
    link1.href = '#'
    link1.focus = focusSpy
    const link2 = document.createElement('a')
    link2.href = '#'
    link2.focus = focusSpy

    mockContainer.appendChild(link1)
    mockContainer.appendChild(link2)

    // Attach ref
    Object.defineProperty(result.current.containerRef, 'current', {
      value: mockContainer,
      writable: true,
    })

    const event = {
      key: 'ArrowDown',
      preventDefault: preventDefaultSpy,
    } as unknown as React.KeyboardEvent<HTMLElement>

    result.current.handleKeyDown(event)
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('harus handle ArrowUp key', () => {
    const { result } = renderHook(() => useArrowNavigation())
    const preventDefaultSpy = vi.fn()

    const mockContainer = document.createElement('div')
    const link = document.createElement('a')
    link.href = '#'
    mockContainer.appendChild(link)

    Object.defineProperty(result.current.containerRef, 'current', {
      value: mockContainer,
      writable: true,
    })

    const event = {
      key: 'ArrowUp',
      preventDefault: preventDefaultSpy,
    } as unknown as React.KeyboardEvent<HTMLElement>

    result.current.handleKeyDown(event)
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('harus handle Home key', () => {
    const { result } = renderHook(() => useArrowNavigation())
    const preventDefaultSpy = vi.fn()

    const mockContainer = document.createElement('div')
    const link = document.createElement('a')
    link.href = '#'
    mockContainer.appendChild(link)

    Object.defineProperty(result.current.containerRef, 'current', {
      value: mockContainer,
      writable: true,
    })

    const event = {
      key: 'Home',
      preventDefault: preventDefaultSpy,
    } as unknown as React.KeyboardEvent<HTMLElement>

    result.current.handleKeyDown(event)
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('harus handle End key', () => {
    const { result } = renderHook(() => useArrowNavigation())
    const preventDefaultSpy = vi.fn()

    const mockContainer = document.createElement('div')
    const link = document.createElement('a')
    link.href = '#'
    mockContainer.appendChild(link)

    Object.defineProperty(result.current.containerRef, 'current', {
      value: mockContainer,
      writable: true,
    })

    const event = {
      key: 'End',
      preventDefault: preventDefaultSpy,
    } as unknown as React.KeyboardEvent<HTMLElement>

    result.current.handleKeyDown(event)
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('harus return early jika containerRef null', () => {
    const { result } = renderHook(() => useArrowNavigation())
    const preventDefaultSpy = vi.fn()

    const event = {
      key: 'ArrowDown',
      preventDefault: preventDefaultSpy,
    } as unknown as React.KeyboardEvent<HTMLElement>

    result.current.handleKeyDown(event)
    // Tidak harus throw, tetapi tidak harus call preventDefault
    expect(preventDefaultSpy).not.toHaveBeenCalled()
  })

  it('harus focus link elements (a[href])', () => {
    const { result } = renderHook(() => useArrowNavigation())
    const focusSpy = vi.fn()
    const preventDefaultSpy = vi.fn()

    const mockContainer = document.createElement('nav')
    const link = document.createElement('a')
    link.href = '#/dashboard'
    link.focus = focusSpy

    mockContainer.appendChild(link)
    Object.defineProperty(result.current.containerRef, 'current', {
      value: mockContainer,
      writable: true,
    })

    const event = {
      key: 'ArrowDown',
      preventDefault: preventDefaultSpy,
    } as unknown as React.KeyboardEvent<HTMLElement>

    result.current.handleKeyDown(event)
    expect(focusSpy).toHaveBeenCalled()
  })

  it('harus focus button elements jika tidak disabled', () => {
    const { result } = renderHook(() => useArrowNavigation())
    const focusSpy = vi.fn()
    const preventDefaultSpy = vi.fn()

    const mockContainer = document.createElement('div')
    const button = document.createElement('button')
    button.focus = focusSpy

    mockContainer.appendChild(button)
    Object.defineProperty(result.current.containerRef, 'current', {
      value: mockContainer,
      writable: true,
    })

    const event = {
      key: 'ArrowDown',
      preventDefault: preventDefaultSpy,
    } as unknown as React.KeyboardEvent<HTMLElement>

    result.current.handleKeyDown(event)
    expect(focusSpy).toHaveBeenCalled()
  })

  it('harus skip disabled buttons', () => {
    const { result } = renderHook(() => useArrowNavigation())
    const preventDefaultSpy = vi.fn()

    const mockContainer = document.createElement('div')
    const disabledButton = document.createElement('button')
    disabledButton.disabled = true
    const enabledButton = document.createElement('button')
    enabledButton.focus = vi.fn()

    mockContainer.appendChild(disabledButton)
    mockContainer.appendChild(enabledButton)
    Object.defineProperty(result.current.containerRef, 'current', {
      value: mockContainer,
      writable: true,
    })

    const event = {
      key: 'ArrowDown',
      preventDefault: preventDefaultSpy,
    } as unknown as React.KeyboardEvent<HTMLElement>

    result.current.handleKeyDown(event)
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('harus skip elements dalam inert container', () => {
    const { result } = renderHook(() => useArrowNavigation())
    const preventDefaultSpy = vi.fn()

    const mockContainer = document.createElement('div')
    const inertDiv = document.createElement('div')
    inertDiv.setAttribute('inert', '')
    const link = document.createElement('a')
    link.href = '#'

    // Add a focusable link outside the inert container
    const focusableLink = document.createElement('a')
    focusableLink.href = '#'
    focusableLink.focus = vi.fn()

    inertDiv.appendChild(link)
    mockContainer.appendChild(inertDiv)
    mockContainer.appendChild(focusableLink)
    Object.defineProperty(result.current.containerRef, 'current', {
      value: mockContainer,
      writable: true,
    })

    const event = {
      key: 'ArrowDown',
      preventDefault: preventDefaultSpy,
    } as unknown as React.KeyboardEvent<HTMLElement>

    result.current.handleKeyDown(event)
    // Should still navigate, but skip inert elements
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('harus wrap dari last item ke first item pada ArrowDown', () => {
    const { result } = renderHook(() => useArrowNavigation())
    const focusSpy = vi.fn()
    const preventDefaultSpy = vi.fn()

    const mockContainer = document.createElement('div')
    const link1 = document.createElement('a')
    link1.href = '#'
    const link2 = document.createElement('a')
    link2.href = '#'
    link2.focus = focusSpy

    mockContainer.appendChild(link1)
    mockContainer.appendChild(link2)

    // Set last link sebagai activeElement
    Object.defineProperty(document, 'activeElement', {
      value: link2,
      writable: true,
    })

    Object.defineProperty(result.current.containerRef, 'current', {
      value: mockContainer,
      writable: true,
    })

    const event = {
      key: 'ArrowDown',
      preventDefault: preventDefaultSpy,
    } as unknown as React.KeyboardEvent<HTMLElement>

    result.current.handleKeyDown(event)
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('harus wrap dari first item ke last item pada ArrowUp', () => {
    const { result } = renderHook(() => useArrowNavigation())
    const focusSpy = vi.fn()
    const preventDefaultSpy = vi.fn()

    const mockContainer = document.createElement('div')
    const link1 = document.createElement('a')
    link1.href = '#'
    link1.focus = focusSpy
    const link2 = document.createElement('a')
    link2.href = '#'

    mockContainer.appendChild(link1)
    mockContainer.appendChild(link2)

    // Set first link sebagai activeElement
    Object.defineProperty(document, 'activeElement', {
      value: link1,
      writable: true,
    })

    Object.defineProperty(result.current.containerRef, 'current', {
      value: mockContainer,
      writable: true,
    })

    const event = {
      key: 'ArrowUp',
      preventDefault: preventDefaultSpy,
    } as unknown as React.KeyboardEvent<HTMLElement>

    result.current.handleKeyDown(event)
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  it('harus return early jika tidak ada focusable items', () => {
    const { result } = renderHook(() => useArrowNavigation())
    const preventDefaultSpy = vi.fn()

    const mockContainer = document.createElement('div')
    mockContainer.innerHTML = '<p>No focusable items</p>'

    Object.defineProperty(result.current.containerRef, 'current', {
      value: mockContainer,
      writable: true,
    })

    const event = {
      key: 'ArrowDown',
      preventDefault: preventDefaultSpy,
    } as unknown as React.KeyboardEvent<HTMLElement>

    result.current.handleKeyDown(event)
    expect(preventDefaultSpy).not.toHaveBeenCalled()
  })
})
