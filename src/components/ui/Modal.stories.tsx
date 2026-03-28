import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'

import { Button } from './Button'
import { Modal, ModalBody, ModalFooter, ModalHeader } from './Modal'

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    open: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Modal>

/* -- Interactive wrapper so users can open/close the modal -- */

function ModalDemo({ size }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Buka Modal</Button>
      <Modal open={open} onClose={() => setOpen(false)} size={size}>
        <ModalHeader title="Judul Modal" onClose={() => setOpen(false)} />
        <ModalBody>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Ini adalah contoh konten di dalam modal. Anda dapat menutup modal dengan menekan tombol
            X atau menekan Escape.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button onClick={() => setOpen(false)}>Simpan</Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

export const Default: Story = {
  render: () => <ModalDemo />,
}

export const Small: Story = {
  render: () => <ModalDemo size="sm" />,
}

export const Large: Story = {
  render: () => <ModalDemo size="lg" />,
}

export const ExtraLarge: Story = {
  render: () => <ModalDemo size="xl" />,
}

function ConfirmDeleteDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Hapus Item
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} size="sm">
        <ModalHeader title="Konfirmasi Hapus" onClose={() => setOpen(false)} />
        <ModalBody>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button variant="danger" onClick={() => setOpen(false)}>
            Hapus
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

export const ConfirmDelete: Story = {
  render: () => <ConfirmDeleteDemo />,
}
