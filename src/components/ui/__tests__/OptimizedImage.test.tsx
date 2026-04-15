import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OptimizedImage } from '../OptimizedImage'

describe('OptimizedImage', () => {
  it('renders with src and alt', () => {
    render(<OptimizedImage src="/test.jpg" alt="Test image" />)
    const img = screen.getByRole('img', { hidden: true }) as HTMLImageElement
    expect(img).toBeInTheDocument()
    // The actual <img> tag may be hidden behind the skeleton; verify it exists in the DOM
    const imgEl = document.querySelector('img[src="/test.jpg"]') as HTMLImageElement
    expect(imgEl).toBeInTheDocument()
    expect(imgEl.alt).toBe('Test image')
  })

  it('has loading="lazy" by default', () => {
    render(<OptimizedImage src="/test.jpg" alt="Lazy image" />)
    const img = document.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('loading')).toBe('lazy')
  })

  it('has loading="eager" when lazy is false', () => {
    render(<OptimizedImage src="/test.jpg" alt="Eager image" lazy={false} />)
    const img = document.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('loading')).toBe('eager')
  })

  it('has decoding="async"', () => {
    render(<OptimizedImage src="/test.jpg" alt="Async decode" />)
    const img = document.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('decoding')).toBe('async')
  })

  it('shows error fallback when image fails to load', () => {
    render(<OptimizedImage src="/broken.jpg" alt="Broken image" />)
    const img = document.querySelector('img') as HTMLImageElement
    fireEvent.error(img)
    // After error, the component should render a div with role="img" and aria-label
    const fallback = screen.getByRole('img', { name: 'Broken image' })
    expect(fallback).toBeInTheDocument()
    // The original <img> tag should no longer be in the DOM (replaced by fallback div)
    expect(document.querySelector('img')).not.toBeInTheDocument()
  })

  it('applies width and height when provided', () => {
    render(<OptimizedImage src="/test.jpg" alt="Sized image" width={200} height={100} />)
    const img = document.querySelector('img') as HTMLImageElement
    expect(img.width).toBe(200)
    expect(img.height).toBe(100)
  })

  it('starts with opacity-0 and transitions to opacity-100 on load', () => {
    render(<OptimizedImage src="/test.jpg" alt="Loading image" />)
    const img = document.querySelector('img') as HTMLImageElement
    // Before load: opacity-0
    expect(img.className).toContain('opacity-0')
    fireEvent.load(img)
    // After load: opacity-100
    expect(img.className).toContain('opacity-100')
  })
})
