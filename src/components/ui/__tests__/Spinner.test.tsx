import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Spinner } from '../Spinner'

describe('Spinner', () => {
  it('renders with default size (md)', () => {
    render(<Spinner />)
    const spinner = screen.getByRole('status')
    expect(spinner).toBeInTheDocument()
    expect(spinner.classList.contains('w-5')).toBe(true)
    expect(spinner.classList.contains('h-5')).toBe(true)
  })

  it('renders sm size', () => {
    render(<Spinner size="sm" />)
    const spinner = screen.getByRole('status')
    expect(spinner.classList.contains('w-4')).toBe(true)
    expect(spinner.classList.contains('h-4')).toBe(true)
  })

  it('renders md size', () => {
    render(<Spinner size="md" />)
    const spinner = screen.getByRole('status')
    expect(spinner.classList.contains('w-5')).toBe(true)
    expect(spinner.classList.contains('h-5')).toBe(true)
  })

  it('renders lg size', () => {
    render(<Spinner size="lg" />)
    const spinner = screen.getByRole('status')
    expect(spinner.classList.contains('w-6')).toBe(true)
    expect(spinner.classList.contains('h-6')).toBe(true)
  })

  it('has aria-label for accessibility', () => {
    render(<Spinner />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveAttribute('aria-label', 'Memuat...')
  })

  it('has animate-spin class', () => {
    render(<Spinner />)
    const spinner = screen.getByRole('status')
    expect(spinner.classList.contains('animate-spin')).toBe(true)
  })

  it('accepts additional className', () => {
    render(<Spinner className="text-blue-500" />)
    const spinner = screen.getByRole('status')
    const classAttr = spinner.getAttribute('class') ?? ''
    expect(classAttr).toContain('text-blue-500')
  })
})
