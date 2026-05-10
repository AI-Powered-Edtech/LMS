import type { Meta, StoryObj } from "@storybook/react";

import { Skeleton, SkeletonCard } from "./Skeleton";

const meta: Meta<typeof Skeleton> = {
  title: "UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  args: {
    width: "w-48",
    height: "h-5",
  },
};

export const Square: Story = {
  args: {
    width: "w-20",
    height: "h-20",
    className: "rounded-xl",
  },
};

export const Circle: Story = {
  args: {
    width: "w-12",
    height: "h-12",
    className: "rounded-full",
  },
};

export const FullWidth: Story = {
  args: {
    width: "w-full",
    height: "h-4",
  },
  decorators: [
    (StoryComponent) => (
      <div style={{ width: 400 }}>
        <StoryComponent />
      </div>
    ),
  ],
};

export const TextLines: Story = {
  render: () => (
    <div style={{ width: 400 }} className="space-y-2">
      <Skeleton width="w-full" height="h-4" />
      <Skeleton width="w-full" height="h-4" />
      <Skeleton width="w-3/5" height="h-4" />
    </div>
  ),
};

/* -- SkeletonCard stories -- */

const cardMeta: Meta<typeof SkeletonCard> = {
  title: "UI/SkeletonCard",
  component: SkeletonCard,
  tags: ["autodocs"],
};

export const CardDefault: StoryObj<typeof SkeletonCard> = {
  render: () => (
    <div style={{ width: 350 }}>
      <SkeletonCard />
    </div>
  ),
};

export const CardWithMoreLines: StoryObj<typeof SkeletonCard> = {
  render: () => (
    <div style={{ width: 350 }}>
      <SkeletonCard lines={4} />
    </div>
  ),
};

export const CardGrid: StoryObj<typeof SkeletonCard> = {
  render: () => (
    <div className="grid grid-cols-2 gap-4" style={{ width: 700 }}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={1} />
    </div>
  ),
};

// Re-export card meta for separate story section
export { cardMeta };
