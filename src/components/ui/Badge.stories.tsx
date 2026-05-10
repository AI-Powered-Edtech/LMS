import type { Meta, StoryObj } from "@storybook/react";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";

import { Badge } from "./Badge";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["info", "success", "warning", "danger", "neutral"],
    },
    size: {
      control: "select",
      options: ["sm", "md"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: { children: "Label" },
};

export const InfoBadge: Story = {
  args: { variant: "info", children: "Informasi" },
};

export const Success: Story = {
  args: { variant: "success", children: "Berhasil" },
};

export const Warning: Story = {
  args: { variant: "warning", children: "Peringatan" },
};

export const Danger: Story = {
  args: { variant: "danger", children: "Gagal" },
};

export const Neutral: Story = {
  args: { variant: "neutral", children: "Netral" },
};

export const SmallSize: Story = {
  args: { size: "sm", variant: "success", children: "Kecil" },
};

export const MediumSize: Story = {
  args: { size: "md", variant: "success", children: "Sedang" },
};

export const WithIconSuccess: Story = {
  args: {
    variant: "success",
    children: "Selesai",
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
};

export const WithIconWarning: Story = {
  args: {
    variant: "warning",
    children: "Perhatian",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
};

export const WithIconInfo: Story = {
  args: {
    variant: "info",
    children: "Detail",
    icon: <Info className="w-3.5 h-3.5" />,
  },
};
