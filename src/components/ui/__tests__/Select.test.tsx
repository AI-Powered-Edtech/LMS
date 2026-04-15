import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Select } from '../Select'

const defaultOptions = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
]

describe('Select', () => {
  it('renders with options', () => {
    render(<Select options={defaultOptions} />)
    const select = screen.getByRole('combobox')
    expect(select).toBeInTheDocument()
    expect(screen.getByText('Option A')).toBeInTheDocument()
    expect(screen.getByText('Option B')).toBeInTheDocument()
    expect(screen.getByText('Option C')).toBeInTheDocument()
  })

  it('renders all options as <option> elements', () => {
    render(<Select options={defaultOptions} />)
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(3)
  })

  it('shows label when provided', () => {
    render(<Select options={defaultOptions} label="Choose one" />)
    expect(screen.getByText('Choose one')).toBeInTheDocument()
    // Label should be associated with the select via htmlFor
    const label = screen.getByText('Choose one')
    const select = screen.getByRole('combobox')
    expect(label).toHaveAttribute('for', select.id)
  })

  it('shows placeholder option when provided', () => {
    render(<Select options={defaultOptions} placeholder="Select..." />)
    const placeholder = screen.getByText('Select...')
    expect(placeholder).toBeInTheDocument()
    expect(placeholder).toHaveAttribute('disabled')
  })

  it('shows error state', () => {
    render(<Select options={defaultOptions} error="Required field" />)
    expect(screen.getByText('Required field')).toBeInTheDocument()
    // The select element should have red border class
    const select = screen.getByRole('combobox')
    expect(select.className).toContain('border-red-400')
  })

  it('does not show error text when error is not provided', () => {
    render(<Select options={defaultOptions} />)
    expect(screen.queryByText('Required field')).not.toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Select options={defaultOptions} disabled />)
    const select = screen.getByRole('combobox')
    expect(select).toBeDisabled()
  })

  it('calls onChange when a value is selected', () => {
    const onChange = vi.fn()
    render(<Select options={defaultOptions} onChange={onChange} />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'b' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('renders sm size', () => {
    render(<Select options={defaultOptions} selectSize="sm" />)
    const select = screen.getByRole('combobox')
    expect(select.className).toContain('px-2')
  })

  it('renders lg size', () => {
    render(<Select options={defaultOptions} selectSize="lg" />)
    const select = screen.getByRole('combobox')
    expect(select.className).toContain('text-sm')
    expect(select.className).toContain('px-3')
  })

  it('accepts external id', () => {
    render(<Select options={defaultOptions} id="my-select" />)
    const select = screen.getByRole('combobox')
    expect(select.id).toBe('my-select')
  })
})
