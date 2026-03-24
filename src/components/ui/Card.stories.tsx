import type { Meta, StoryObj } from '@storybook/react'

import { Card } from './Card'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
    hover: { control: 'boolean' },
    border: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  args: {
    children: (
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Judul Kartu</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Ini adalah contoh konten di dalam kartu.
        </p>
      </div>
    ),
  },
}

export const PaddingNone: Story = {
  args: {
    padding: 'none',
    children: (
      <div className="p-4">
        <p className="text-sm text-slate-700 dark:text-slate-300">Tanpa padding bawaan</p>
      </div>
    ),
  },
}

export const PaddingSmall: Story = {
  args: {
    padding: 'sm',
    children: <p className="text-sm text-slate-700 dark:text-slate-300">Padding kecil</p>,
  },
}

export const PaddingLarge: Story = {
  args: {
    padding: 'lg',
    children: <p className="text-sm text-slate-700 dark:text-slate-300">Padding besar</p>,
  },
}

export const Hoverable: Story = {
  args: {
    hover: true,
    children: (
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Kartu Interaktif</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Arahkan kursor ke sini untuk melihat efek hover.
        </p>
      </div>
    ),
  },
}

export const WithoutBorder: Story = {
  args: {
    border: false,
    children: (
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Tanpa Border</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kartu ini tidak memiliki border.
        </p>
      </div>
    ),
  },
}
