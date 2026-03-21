import type { Meta, StoryObj } from '@storybook/react'
import { Tooltip } from './Tooltip'
import { Button } from './Button'

const meta: Meta<typeof Tooltip> = {
  title: 'UI/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  argTypes: {
    position: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
    },
  },
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof Tooltip>

export const Default: Story = {
  args: {
    content: 'Ini adalah tooltip',
    children: <Button variant="secondary">Arahkan ke sini</Button>,
  },
}

export const Top: Story = {
  args: {
    content: 'Posisi atas',
    position: 'top',
    children: <Button variant="secondary">Atas</Button>,
  },
}

export const Bottom: Story = {
  args: {
    content: 'Posisi bawah',
    position: 'bottom',
    children: <Button variant="secondary">Bawah</Button>,
  },
}

export const Left: Story = {
  args: {
    content: 'Posisi kiri',
    position: 'left',
    children: <Button variant="secondary">Kiri</Button>,
  },
}

export const Right: Story = {
  args: {
    content: 'Posisi kanan',
    position: 'right',
    children: <Button variant="secondary">Kanan</Button>,
  },
}

export const AllPositions: Story = {
  render: () => (
    <div className="flex gap-8 p-16">
      <Tooltip content="Atas" position="top">
        <Button variant="secondary">Atas</Button>
      </Tooltip>
      <Tooltip content="Bawah" position="bottom">
        <Button variant="secondary">Bawah</Button>
      </Tooltip>
      <Tooltip content="Kiri" position="left">
        <Button variant="secondary">Kiri</Button>
      </Tooltip>
      <Tooltip content="Kanan" position="right">
        <Button variant="secondary">Kanan</Button>
      </Tooltip>
    </div>
  ),
}
