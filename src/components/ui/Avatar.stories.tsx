import type { Meta, StoryObj } from '@storybook/react'
import { Avatar } from './Avatar'

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    online: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Avatar>

export const Default: Story = {
  args: {
    name: 'Ahmad Rizky',
  },
}

export const WithImage: Story = {
  args: {
    name: 'Siti Nurhaliza',
    src: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Siti',
  },
}

export const Initials: Story = {
  args: {
    name: 'Budi Santoso',
  },
}

export const SingleName: Story = {
  args: {
    name: 'Dewi',
  },
}

export const Small: Story = {
  args: {
    name: 'Ahmad Rizky',
    size: 'sm',
  },
}

export const Medium: Story = {
  args: {
    name: 'Ahmad Rizky',
    size: 'md',
  },
}

export const Large: Story = {
  args: {
    name: 'Ahmad Rizky',
    size: 'lg',
  },
}

export const Online: Story = {
  args: {
    name: 'Rina Wati',
    online: true,
  },
}

export const Offline: Story = {
  args: {
    name: 'Joko Widodo',
    online: false,
  },
}

export const BrokenImage: Story = {
  args: {
    name: 'Fallback Test',
    src: 'https://invalid-url-that-will-fail.example/avatar.png',
  },
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Avatar name="Kecil" size="sm" />
      <Avatar name="Sedang" size="md" />
      <Avatar name="Besar" size="lg" />
    </div>
  ),
}
