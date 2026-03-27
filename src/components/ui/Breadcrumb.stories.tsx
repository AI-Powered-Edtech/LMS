import type { Meta, StoryObj } from '@storybook/react'
import { MemoryRouter } from 'react-router-dom'
import { Breadcrumb } from './Breadcrumb'

const meta: Meta<typeof Breadcrumb> = {
  title: 'UI/Breadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof Breadcrumb>

export const Default: Story = {
  args: {
    items: [
      { label: 'Beranda', href: '/' },
      { label: 'Kursus', href: '/courses' },
      { label: 'Matematika Dasar' },
    ],
  },
}

export const TwoLevels: Story = {
  args: {
    items: [{ label: 'Beranda', href: '/' }, { label: 'Pengaturan' }],
  },
}

export const FourLevels: Story = {
  args: {
    items: [
      { label: 'Beranda', href: '/' },
      { label: 'Kursus', href: '/courses' },
      { label: 'Matematika', href: '/courses/math' },
      { label: 'Bab 1: Aljabar' },
    ],
  },
}

export const SingleItem: Story = {
  args: {
    items: [{ label: 'Beranda' }],
  },
}

export const LongLabels: Story = {
  args: {
    items: [
      { label: 'Beranda', href: '/' },
      { label: 'Mata Pelajaran Semester Genap', href: '/courses' },
      { label: 'Matematika Tingkat Lanjut Kelas XII IPA' },
    ],
  },
}
