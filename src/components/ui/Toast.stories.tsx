import type { Meta, StoryObj } from "@storybook/react";
import { useEffect } from "react";

import { ToastContainer, useToast } from "./Toast";

const meta: Meta<typeof ToastContainer> = {
  title: "UI/Toast",
  component: ToastContainer,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof ToastContainer>;

/* -- Helpers to trigger toasts inside stories -- */

function ToastTrigger({
  type,
  message,
  description,
}: {
  type: "success" | "error" | "warning" | "info";
  message: string;
  description?: string;
}) {
  const addToast = useToast((s) => s.addToast);

  useEffect(() => {
    addToast({ type, message, description });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <ToastContainer />;
}

export const Success: Story = {
  render: () => (
    <ToastTrigger type="success" message="Data berhasil disimpan" />
  ),
};

export const Error: Story = {
  render: () => (
    <ToastTrigger
      type="error"
      message="Gagal menyimpan data"
      description="Silakan coba lagi nanti."
    />
  ),
};

export const Warning: Story = {
  render: () => (
    <ToastTrigger
      type="warning"
      message="Koneksi tidak stabil"
      description="Beberapa fitur mungkin tidak tersedia."
    />
  ),
};

export const Info: Story = {
  render: () => (
    <ToastTrigger
      type="info"
      message="Pembaruan tersedia"
      description="Versi baru telah dirilis."
    />
  ),
};

function AllToastsDemo() {
  const addToast = useToast((s) => s.addToast);

  return (
    <div className="p-8 flex flex-col gap-3">
      <button
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm"
        onClick={() =>
          addToast({ type: "success", message: "Berhasil disimpan!" })
        }
      >
        Tampilkan Sukses
      </button>
      <button
        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
        onClick={() =>
          addToast({
            type: "error",
            message: "Terjadi kesalahan",
            description: "Coba lagi.",
          })
        }
      >
        Tampilkan Error
      </button>
      <button
        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm"
        onClick={() => addToast({ type: "warning", message: "Perhatian!" })}
      >
        Tampilkan Peringatan
      </button>
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
        onClick={() =>
          addToast({ type: "info", message: "Info baru tersedia" })
        }
      >
        Tampilkan Info
      </button>
      <ToastContainer />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <AllToastsDemo />,
};
