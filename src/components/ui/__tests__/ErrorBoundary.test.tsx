import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ErrorBoundary } from '../ErrorBoundary'

// A component that throws on render
function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>Child rendered</div>
}

describe('ErrorBoundary', () => {
  // Suppress React error boundary console errors in test output
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Safe content')).toBeInTheDocument()
  })

  it('shows default fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    )
    // ErrorFallback uses "Terjadi Kesalahan" as title
    expect(screen.getByText('Terjadi Kesalahan')).toBeInTheDocument()
    expect(screen.getByText('Maaf, terjadi kesalahan yang tidak terduga.')).toBeInTheDocument()
  })

  it('shows custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom error</div>}>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText('Custom error')).toBeInTheDocument()
    expect(screen.queryByText('Terjadi Kesalahan')).not.toBeInTheDocument()
  })

  it('calls onRetry when reset button is clicked', () => {
    const onRetry = vi.fn()
    render(
      <ErrorBoundary onRetry={onRetry}>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    )
    // The ErrorFallback shows a "Coba Lagi" (retry) button
    const retryBtn = screen.getByText('Coba Lagi')
    expect(retryBtn).toBeInTheDocument()
    fireEvent.click(retryBtn)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows home link by default in fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByText('Kembali ke Beranda')).toBeInTheDocument()
  })

  it('renders alert role in fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow />
      </ErrorBoundary>
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
