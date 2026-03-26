import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useToast } from '@/src/hooks/useToast'
import { ToastContainer } from '../Toast'
import { act } from 'react'

describe('useToast', () => {
  beforeEach(() => {
    // Reset store state between tests
    act(() => {
      const state = useToast.getState()
      state.toasts.forEach((t) => state.removeToast(t.id))
    })
  })

  it('starts with an empty toasts array', () => {
    expect(useToast.getState().toasts).toHaveLength(0)
  })

  it('can add a toast', () => {
    act(() => {
      useToast.getState().addToast({ type: 'success', message: 'Test toast' })
    })
    const toasts = useToast.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].type).toBe('success')
    expect(toasts[0].message).toBe('Test toast')
    expect(toasts[0].id).toBeDefined()
  })

  it('can add a toast with description', () => {
    act(() => {
      useToast.getState().addToast({ type: 'info', message: 'Title', description: 'Details' })
    })
    const toasts = useToast.getState().toasts
    expect(toasts).toHaveLength(1)
    expect(toasts[0].description).toBe('Details')
  })

  it('can dismiss a toast', () => {
    act(() => {
      useToast.getState().addToast({ type: 'error', message: 'Error msg' })
    })
    const id = useToast.getState().toasts[0].id
    act(() => {
      useToast.getState().removeToast(id)
    })
    expect(useToast.getState().toasts).toHaveLength(0)
  })

  it('limits to MAX_TOASTS (3)', () => {
    act(() => {
      const { addToast } = useToast.getState()
      addToast({ type: 'info', message: 'Toast 1' })
      addToast({ type: 'info', message: 'Toast 2' })
      addToast({ type: 'info', message: 'Toast 3' })
      addToast({ type: 'info', message: 'Toast 4' })
    })
    const toasts = useToast.getState().toasts
    expect(toasts.length).toBeLessThanOrEqual(3)
    // The oldest toast should have been evicted
    expect(toasts.find((t) => t.message === 'Toast 1')).toBeUndefined()
  })
})

describe('ToastContainer', () => {
  beforeEach(() => {
    act(() => {
      const state = useToast.getState()
      state.toasts.forEach((t) => state.removeToast(t.id))
    })
  })

  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastContainer />)
    expect(container.innerHTML).toBe('')
  })

  it('renders toasts when they exist', () => {
    act(() => {
      useToast.getState().addToast({ type: 'success', message: 'Saved!' })
    })
    render(<ToastContainer />)
    expect(screen.getByText('Saved!')).toBeInTheDocument()
  })

  it('renders multiple toasts', () => {
    act(() => {
      useToast.getState().addToast({ type: 'success', message: 'First' })
      useToast.getState().addToast({ type: 'error', message: 'Second' })
    })
    render(<ToastContainer />)
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })

  it('renders toast with role="alert"', () => {
    act(() => {
      useToast.getState().addToast({ type: 'warning', message: 'Warning!' })
    })
    render(<ToastContainer />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('has a region role with aria-label', () => {
    act(() => {
      useToast.getState().addToast({ type: 'info', message: 'Info' })
    })
    render(<ToastContainer />)
    expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Notifikasi')
  })
})
