import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Modal, ModalBody, ModalFooter, ModalHeader } from '../Modal'

describe('Modal accessibility (a11y)', () => {
  it('has role="dialog" and aria-modal="true"', () => {
    render(
      <Modal open onClose={vi.fn()}>
        <ModalHeader title="Dialog Test" onClose={vi.fn()} />
        <ModalBody>Content</ModalBody>
      </Modal>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby')
  })

  it('focuses first focusable element on open', async () => {
    render(
      <Modal open onClose={vi.fn()}>
        <ModalHeader title="Focus Test" onClose={vi.fn()} />
        <ModalBody>
          <button>First Button</button>
          <button>Second Button</button>
        </ModalBody>
      </Modal>
    )
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    const firstBtn = screen.getByRole('button', { name: 'Tutup' })
    expect(document.activeElement).toBe(firstBtn)
  })

  it('traps focus within the modal — Tab cycles forward', async () => {
    const user = userEvent.setup()
    render(
      <Modal open onClose={vi.fn()}>
        <ModalHeader title="Focus Trap" onClose={vi.fn()} />
        <ModalBody>
          <button id="btn1">Button 1</button>
          <button id="btn2">Button 2</button>
          <button id="btn3">Button 3</button>
        </ModalBody>
        <ModalFooter>
          <button id="btn4">Button 4</button>
        </ModalFooter>
      </Modal>
    )
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    const closeBtn = screen.getByRole('button', { name: 'Tutup' })
    const btn1 = document.getElementById('btn1')!
    const btn2 = document.getElementById('btn2')!
    const btn3 = document.getElementById('btn3')!
    const btn4 = document.getElementById('btn4')!

    closeBtn.focus()
    expect(document.activeElement).toBe(closeBtn)

    await user.tab()
    expect(document.activeElement).toBe(btn1)

    await user.tab()
    expect(document.activeElement).toBe(btn2)

    await user.tab()
    expect(document.activeElement).toBe(btn3)

    await user.tab()
    expect(document.activeElement).toBe(btn4)

    await user.tab()
    expect(document.activeElement).toBe(closeBtn)
  })

  it('traps focus within the modal — Shift+Tab cycles backward', async () => {
    const user = userEvent.setup()
    render(
      <Modal open onClose={vi.fn()}>
        <ModalHeader title="Focus Trap" onClose={vi.fn()} />
        <ModalBody>
          <button id="btn1">Button 1</button>
          <button id="btn2">Button 2</button>
        </ModalBody>
      </Modal>
    )
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })

    const closeBtn = screen.getByRole('button', { name: 'Tutup' })
    const btn1 = document.getElementById('btn1')!
    const btn2 = document.getElementById('btn2')!

    btn1.focus()
    expect(document.activeElement).toBe(btn1)

    await user.tab({ shift: true })
    expect(document.activeElement).toBe(closeBtn)

    await user.tab({ shift: true })
    expect(document.activeElement).toBe(btn2)
  })

  it('closes modal on Escape key', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose}>
        <ModalBody>Content</ModalBody>
      </Modal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('returns focus to trigger element on close', async () => {
    function TestHarness() {
      const [open, setOpen] = useState(false)
      const triggerRef = useRef<HTMLButtonElement>(null)
      return (
        <div>
          <button ref={triggerRef} onClick={() => setOpen(true)}>
            Open Modal
          </button>
          {open && (
            <Modal open={open} onClose={() => setOpen(false)}>
              <ModalBody>Content</ModalBody>
            </Modal>
          )}
        </div>
      )
    }
    render(<TestHarness />)
    const trigger = screen.getByRole('button', { name: 'Open Modal' })
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    fireEvent.click(trigger)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100))
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(document.activeElement).toBe(trigger)
  })
})
