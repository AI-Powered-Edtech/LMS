import type { Meta, StoryObj } from "@storybook/react";

import { OptimizedImage } from "./OptimizedImage";

const meta: Meta<typeof OptimizedImage> = {
  title: "UI/OptimizedImage",
  component: OptimizedImage,
  tags: ["autodocs"],
  argTypes: {
    lazy: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof OptimizedImage>;

export const Default: Story = {
  args: {
    src: "https://picsum.photos/800/450",
    alt: "Sample image",
    width: 800,
    height: 450,
  },
};

export const LoadingState: Story = {
  args: {
    src: "https://picsum.photos/800/450?cache=" + Date.now(),
    alt: "Image loading demonstration",
    width: 800,
    height: 450,
  },
};

export const ErrorState: Story = {
  args: {
    src: "https://invalid-url-that-will-fail.test/image.jpg",
    alt: "Failed to load image",
    width: 800,
    height: 450,
  },
};

export const FixedSize: Story = {
  args: {
    src: "https://picsum.photos/320/240",
    alt: "Fixed size image",
    width: 320,
    height: 240,
  },
};

export const WithoutLazyLoading: Story = {
  args: {
    src: "https://picsum.photos/800/450",
    alt: "Eager loaded image",
    width: 800,
    height: 450,
    lazy: false,
  },
};

export const Responsive: Story = {
  args: {
    src: "https://picsum.photos/1200/600",
    alt: "Responsive image",
  },
};
