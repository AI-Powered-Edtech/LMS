import type { Meta, StoryObj } from '@storybook/react'
import { Download, Plus, Trash2 } from 'lucide-react'

import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Default: Story = {
  args: { children: 'Tombol' },
}

export const Primary: Story = {
  args: { variant: 'primary', children: 'Utama' },
}

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Sekunder' },
}

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Transparan' },
}

export const Danger: Story = {
  args: { variant: 'danger', children: 'Hapus' },
}

export const Small: Story = {
  args: { size: 'sm', children: 'Kecil' },
}

export const Medium: Story = {
  args: { size: 'md', children: 'Sedang' },
}

export const Large: Story = {
  args: { size: 'lg', children: 'Besar' },
}

export const Loading: Story = {
  args: { loading: true, children: 'Memuat...' },
}

export const Disabled: Story = {
  args: { disabled: true, children: 'Nonaktif' },
}

export const FullWidth: Story = {
  args: { fullWidth: true, children: 'Lebar Penuh' },
}

export const WithIconLeft: Story = {
  args: {
    children: 'Tambah',
    icon: <Plus className="w-4 h-4" />,
  },
}

export const DangerWithIcon: Story = {
  args: {
    variant: 'danger',
    children: 'Hapus Item',
    icon: <Trash2 className="w-4 h-4" />,
  },
}

export const SecondaryWithIcon: Story = {
  args: {
    variant: 'secondary',
    children: 'Unduh',
    icon: <Download className="w-4 h-4" />,
  },
}
