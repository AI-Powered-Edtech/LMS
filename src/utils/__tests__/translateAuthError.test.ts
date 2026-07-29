import { describe, expect, it } from "vitest";

import { translateAuthError } from "@/utils/translateAuthError";

describe("translateAuthError", () => {
  it("handles falsy messages", () => {
    expect(translateAuthError("")).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
  });

  it("handles network errors", () => {
    const expected =
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("Failed to fetch")).toBe(expected);
    expect(translateAuthError("NetworkError")).toBe(expected);
    expect(translateAuthError("Load failed")).toBe(expected);
    expect(translateAuthError("CORS")).toBe(expected);
    expect(translateAuthError("Cross-origin")).toBe(expected);
    expect(translateAuthError("Mixed content")).toBe(expected);
  });

  it("handles invalid credentials", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("Invalid login credentials")).toBe(expected);
    expect(translateAuthError("invalid_credentials")).toBe(expected);
  });

  it("handles unconfirmed email", () => {
    expect(translateAuthError("Email not confirmed")).toBe(
      "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.",
    );
  });

  it("handles rate limits", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("Too many requests")).toBe(expected);
    expect(translateAuthError("Rate limit")).toBe(expected);
  });

  it("handles user not found", () => {
    expect(translateAuthError("User not found")).toBe(
      "Akun tidak ditemukan. Pastikan email yang dimasukkan benar.",
    );
  });

  it("handles existing user", () => {
    const expected =
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("User already registered")).toBe(expected);
    expect(translateAuthError("Already exists")).toBe(expected);
  });

  it("handles short password", () => {
    expect(translateAuthError("Password should be at least")).toBe(
      "Kata sandi terlalu pendek. Gunakan minimal 6 karakter.",
    );
  });

  it("handles weak password", () => {
    const expected =
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.";
    expect(translateAuthError("Weak password")).toBe(expected);
    expect(translateAuthError("Password strength")).toBe(expected);
  });

  it("handles expired token", () => {
    const expected = "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("Token expired")).toBe(expected);
    expect(translateAuthError("Expired token")).toBe(expected);
  });

  it("handles invalid token", () => {
    expect(translateAuthError("Invalid token")).toBe(
      "Tautan tidak valid atau sudah digunakan.",
    );
  });

  it("falls back to the raw message if unknown", () => {
    expect(translateAuthError("Some random error")).toBe("Some random error");
    expect(translateAuthError("Unknown Error 500")).toBe("Unknown Error 500");
  });
});
