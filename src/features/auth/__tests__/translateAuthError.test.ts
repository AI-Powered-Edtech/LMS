import { describe, expect, it } from "vitest";

import { translateAuthError } from "@/utils/translateAuthError";

describe("translateAuthError", () => {
  it("handles network/fetch errors", () => {
    expect(translateAuthError("Failed to fetch")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.",
    );
  });

  it("handles invalid login credentials", () => {
    expect(translateAuthError("invalid login credentials")).toBe(
      "Email atau kata sandi salah. Silakan coba lagi.",
    );
  });

  it("handles email not confirmed", () => {
    expect(translateAuthError("email not confirmed")).toBe(
      "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.",
    );
  });

  it("handles too many requests", () => {
    expect(translateAuthError("too many requests")).toBe(
      "Terlalu banyak percobaan. Silakan tunggu beberapa saat.",
    );
  });

  it("handles user not found", () => {
    expect(translateAuthError("user not found")).toBe(
      "Akun tidak ditemukan. Pastikan email yang dimasukkan benar.",
    );
  });

  it("handles user already registered", () => {
    expect(translateAuthError("user already registered")).toBe(
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.",
    );
  });

  it("handles weak password", () => {
    expect(translateAuthError("password should be at least 6 characters")).toBe(
      "Kata sandi terlalu pendek. Gunakan minimal 6 karakter.",
    );
    expect(translateAuthError("weak password")).toBe(
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.",
    );
  });

  it("handles invalid or expired token", () => {
    expect(translateAuthError("token expired")).toBe(
      "Tautan sudah kedaluwarsa. Silakan minta tautan baru.",
    );
    expect(translateAuthError("invalid token")).toBe(
      "Tautan tidak valid atau sudah digunakan.",
    );
  });

  it("returns fallback for empty string", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("returns raw message for unknown errors", () => {
    expect(translateAuthError("Something completely different")).toBe("Something completely different");
  });
});
