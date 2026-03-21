import type { Meta, StoryObj } from '@storybook/react'
import { Select } from './Select'

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: {
    selectSize: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Select>

const kelasOptions = [
  { value: '10a', label: 'Kelas 10A' },
  { value: '10b', label: 'Kelas 10B' },
  { value: '11a', label: 'Kelas 11A' },
  { value: '11b', label: 'Kelas 11B' },
]

const mataPelajaranOptions = [
  { value: 'math', label: 'Matematika' },
  { value: 'science', label: 'IPA' },
  { value: 'english', label: 'Bahasa Inggris' },
  { value: 'history', label: 'Sejarah' },
]

export const Default: Story = {
  args: {
    options: kelasOptions,
    placeholder: 'Pilih kelas...',
  },
}

export const WithLabel: Story = {
  args: {
    label: 'Kelas',
    options: kelasOptions,
    placeholder: 'Pilih kelas...',
  },
}

export const WithError: Story = {
  args: {
    label: 'Mata Pelajaran',
    options: mataPelajaranOptions,
    placeholder: 'Pilih mata pelajaran...',
    error: 'Mata pelajaran wajib dipilih',
  },
}

export const Disabled: Story = {
  args: {
    label: 'Kelas',
    options: kelasOptions,
    placeholder: 'Pilih kelas...',
    disabled: true,
  },
}

export const Small: Story = {
  args: {
    selectSize: 'sm',
    options: kelasOptions,
    placeholder: 'Ukuran kecil',
  },
}

export const Large: Story = {
  args: {
    selectSize: 'lg',
    options: mataPelajaranOptions,
    placeholder: 'Ukuran besar',
  },
}
