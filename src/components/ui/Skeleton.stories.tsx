// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import type { Meta, StoryObj } from '@storybook/react'

import { Skeleton, SkeletonCard } from './Skeleton'

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Skeleton>

export const Default: Story = {
  args: {
    width: 200,
    height: 20,
  },
}

export const Square: Story = {
  args: {
    width: 80,
    height: 80,
    className: 'rounded-xl',
  },
}

export const Circle: Story = {
  args: {
    width: 48,
    height: 48,
    className: 'rounded-full',
  },
}

export const FullWidth: Story = {
  args: {
    width: '100%',
    height: 16,
  },
  decorators: [
    (Story) => (
      <div style={%DOPEN% width: 400 %DCLOSE%}>
        <Story />
      </div>
    ),
  ],
}

export const TextLines: Story = {
  render: () => (
    <div style={%DOPEN% width: 400 %DCLOSE%} className="space-y-2">
      <Skeleton width="100%" height={16} />
      <Skeleton width="100%" height={16} />
      <Skeleton width="60%" height={16} />
    </div>
  ),
}

/* -- SkeletonCard stories -- */

const cardMeta: Meta<typeof SkeletonCard> = {
  title: 'UI/SkeletonCard',
  component: SkeletonCard,
  tags: ['autodocs'],
}

export const CardDefault: StoryObj<typeof SkeletonCard> = {
  render: () => (
    <div style={%DOPEN% width: 350 %DCLOSE%}>
      <SkeletonCard />
    </div>
  ),
}

export const CardWithMoreLines: StoryObj<typeof SkeletonCard> = {
  render: () => (
    <div style={%DOPEN% width: 350 %DCLOSE%}>
      <SkeletonCard lines={4} />
    </div>
  ),
}

export const CardGrid: StoryObj<typeof SkeletonCard> = {
  render: () => (
    <div className="grid grid-cols-2 gap-4" style={%DOPEN% width: 700 %DCLOSE%}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={1} />
    </div>
  ),
}

// Re-export card meta for separate story section
export { cardMeta }
