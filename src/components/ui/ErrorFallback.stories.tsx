import type { Meta, StoryObj } from "@storybook/react";

import { ErrorFallback } from "./ErrorFallback";

const meta: Meta<typeof ErrorFallback> = {
  title: "UI/ErrorFallback",
  component: ErrorFallback,
  tags: ["autodocs"],
  argTypes: {
    onRetry: { action: "retry clicked" },
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};

export default meta;
type Story = StoryObj<typeof ErrorFallback>;

export const Default: Story = {};

export const WithRetry: Story = {
  args: {
    onRetry: () => {},
  },
};

export const WithoutHomeLink: Story = {
  args: {
    showHomeLink: false,
    onRetry: () => {},
  },
};

export const CustomMessage: Story = {
  args: {
    title: "Gagal Memuat Data",
    description:
      "Tidak dapat menghubungi server. Periksa koneksi internet Anda dan coba kembali.",
    onRetry: () => {},
  },
};

export const Minimal: Story = {
  args: {
    showHomeLink: false,
    title: undefined,
    description: undefined,
  },
};
