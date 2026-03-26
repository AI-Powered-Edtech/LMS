<<<<<<< Updated upstream
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Modal, ModalBody, ModalFooter, ModalHeader } from '../Modal'
=======
import { fireEvent,render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Modal, ModalBody, ModalFooter,ModalHeader } from '../Modal'
>>>>>>> Stashed changes

describe('Modal', () => {
  it('renders when open is true', () => {
    render(
      <Modal open onClose={vi.fn()}>
        <ModalBody>Modal content</ModalBody>
      </Modal>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('does not render when open is false', () => {
    render(
      <Modal open={false} onClose={vi.fn()}>
        <ModalBody>Modal content</ModalBody>
      </Modal>
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose}>
        <ModalBody>Content</ModalBody>
      </Modal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking backdrop overlay', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal open onClose={onClose}>
        <ModalBody>Content</ModalBody>
      </Modal>
    )
    // The overlay is the outermost fixed div
    const overlay = container.querySelector('.fixed.inset-0.z-50')
    if (overlay) {
      fireEvent.click(overlay)
    }
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders children content', () => {
    render(
      <Modal open onClose={vi.fn()}>
        <ModalBody>
          <p>Hello World</p>
        </ModalBody>
      </Modal>
    )
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('has aria-modal attribute set to true', () => {
    render(
      <Modal open onClose={vi.fn()}>
        <ModalBody>Content</ModalBody>
      </Modal>
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('uses ariaLabel when provided', () => {
    render(
      <Modal open onClose={vi.fn()} ariaLabel="Test dialog">
        <ModalBody>Content</ModalBody>
      </Modal>
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Test dialog')
  })
})

describe('ModalHeader', () => {
  it('renders title', () => {
    render(
      <Modal open onClose={vi.fn()}>
        <ModalHeader title="Test Title" />
      </Modal>
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('renders close button when onClose is provided', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={vi.fn()}>
        <ModalHeader title="Title" onClose={onClose} />
      </Modal>
    )
    const closeBtn = screen.getByLabelText('Tutup')
    expect(closeBtn).toBeInTheDocument()
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('ModalBody', () => {
  it('renders children', () => {
    render(
      <Modal open onClose={vi.fn()}>
        <ModalBody>Body content</ModalBody>
      </Modal>
    )
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })
})

describe('ModalFooter', () => {
  it('renders children', () => {
    render(
      <Modal open onClose={vi.fn()}>
        <ModalFooter>
          <button>Save</button>
        </ModalFooter>
      </Modal>
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})
