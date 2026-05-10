import { describe, expect, it } from "vitest";

import { translateAuthError } from "@/utils/translateAuthError";

describe("translateAuthError", () => {
  it("handles network/fetch errors", () => {
    expect(translateAuthError("Failed to fetch")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.",
    );
  });
});
