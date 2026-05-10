import type { Meta, StoryObj } from "@storybook/react";

import { Spinner } from "./Spinner";

const meta: Meta<typeof Spinner> = {
  title: "UI/Spinner",
  component: Spinner,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {
  args: {},
};

export const Small: Story = {
  args: { size: "sm" },
};

export const Medium: Story = {
  args: { size: "md" },
};

export const Large: Story = {
  args: { size: "lg" },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <Spinner size="sm" />
        <span className="text-xs text-slate-500">Kecil</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Spinner size="md" />
        <span className="text-xs text-slate-500">Sedang</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Spinner size="lg" />
        <span className="text-xs text-slate-500">Besar</span>
      </div>
    </div>
  ),
};

export const CustomColor: Story = {
  args: {
    className: "text-emerald-500",
  },
};
