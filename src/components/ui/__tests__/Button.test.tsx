import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Button } from '../Button'

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    const btn = screen.getByRole('button', { name: 'Click me' })
    expect(btn).toBeInTheDocument()
    expect(btn).not.toBeDisabled()
  })

  it('renders children correctly', () => {
    render(
      <Button>
        <span data-testid="child">Inner content</span>
      </Button>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Inner content')).toBeInTheDocument()
  })

  it('renders primary variant (default)', () => {
    render(<Button>Primary</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-blue-600')
  })

  it('renders secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-slate-100')
  })

  it('renders ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('text-slate-600')
  })

  it('renders danger variant', () => {
    render(<Button variant="danger">Danger</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('bg-red-600')
  })

  it('renders sm size', () => {
    render(<Button size="sm">Small</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('px-3')
    expect(btn.className).toContain('py-1.5')
  })

  it('renders md size (default)', () => {
    render(<Button>Medium</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('px-4')
    expect(btn.className).toContain('py-2')
  })

  it('renders lg size', () => {
    render(<Button size="lg">Large</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('px-6')
    expect(btn.className).toContain('py-3')
  })

  it('shows loading spinner when loading is true', () => {
    render(<Button loading>Loading</Button>)
    const btn = screen.getByRole('button')
    // The SVG spinner has class animate-spin
    const spinner = btn.querySelector('svg.animate-spin')
    expect(spinner).toBeInTheDocument()
    expect(btn).toBeDisabled()
  })

  it('does not show spinner when loading is false', () => {
    render(<Button>Not loading</Button>)
    const btn = screen.getByRole('button')
    const spinner = btn.querySelector('svg.animate-spin')
    expect(spinner).not.toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn.className).toContain('opacity-50')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onClick when disabled', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('does NOT call onClick when loading', () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Loading
      </Button>
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('renders full width when fullWidth is true', () => {
    render(<Button fullWidth>Full</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toContain('w-full')
  })

  it('renders icon when provided', () => {
    render(<Button icon={<span data-testid="icon">*</span>}>With icon</Button>)
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('does not render icon when loading (shows spinner instead)', () => {
    render(
      <Button loading icon={<span data-testid="icon">*</span>}>
        Loading with icon
      </Button>
    )
    expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
    const btn = screen.getByRole('button')
    expect(btn.querySelector('svg.animate-spin')).toBeInTheDocument()
  })
})
