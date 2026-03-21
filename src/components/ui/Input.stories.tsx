import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'
import { Search, Mail } from 'lucide-react'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    inputSize: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: {
    placeholder: 'Masukkan teks...',
  },
}

export const WithLabel: Story = {
  args: {
    label: 'Nama Lengkap',
    placeholder: 'Masukkan nama lengkap',
  },
}

export const WithError: Story = {
  args: {
    label: 'Email',
    placeholder: 'contoh@email.com',
    error: 'Email tidak valid',
    defaultValue: 'bukan-email',
  },
}

export const Disabled: Story = {
  args: {
    label: 'Bidang Nonaktif',
    placeholder: 'Tidak dapat diubah',
    disabled: true,
  },
}

export const WithIcon: Story = {
  args: {
    placeholder: 'Cari...',
    icon: <Search className="w-4 h-4" />,
  },
}

export const EmailWithIcon: Story = {
  args: {
    label: 'Alamat Email',
    placeholder: 'contoh@email.com',
    icon: <Mail className="w-4 h-4" />,
    type: 'email',
  },
}

export const Small: Story = {
  args: {
    inputSize: 'sm',
    placeholder: 'Ukuran kecil',
  },
}

export const Large: Story = {
  args: {
    inputSize: 'lg',
    placeholder: 'Ukuran besar',
  },
}

export const Password: Story = {
  args: {
    label: 'Kata Sandi',
    type: 'password',
    placeholder: 'Masukkan kata sandi',
  },
}
