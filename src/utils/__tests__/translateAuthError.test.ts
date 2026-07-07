import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("returns default message for empty or undefined input", () => {
    expect(translateAuthError("")).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    // @ts-expect-error testing undefined
    expect(translateAuthError(undefined)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    // @ts-expect-error testing null
    expect(translateAuthError(null)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
  });

  it("handles network errors", () => {
    const expected =
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("failed to fetch")).toBe(expected);
    expect(translateAuthError("NetworkError")).toBe(expected);
    expect(translateAuthError("load failed")).toBe(expected);
    expect(translateAuthError("cors error")).toBe(expected);
    expect(translateAuthError("Cross-Origin Request Blocked")).toBe(expected);
    expect(translateAuthError("mixed content warning")).toBe(expected);
  });

  it("handles invalid credentials", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("invalid login credentials")).toBe(expected);
    expect(translateAuthError("invalid_credentials")).toBe(expected);
  });

  it("handles unconfirmed email", () => {
    expect(translateAuthError("email not confirmed")).toBe(
      "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.",
    );
  });

  it("handles rate limiting", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("too many requests")).toBe(expected);
    expect(translateAuthError("rate limit exceeded")).toBe(expected);
  });

  it("handles user not found", () => {
    expect(translateAuthError("user not found")).toBe(
      "Akun tidak ditemukan. Pastikan email yang dimasukkan benar.",
    );
  });

  it("handles already registered", () => {
    const expected =
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("user already registered")).toBe(expected);
    expect(translateAuthError("email already exists")).toBe(expected);
  });

  it("handles weak passwords", () => {
    expect(translateAuthError("password should be at least 6 characters")).toBe(
      "Kata sandi terlalu pendek. Gunakan minimal 6 karakter.",
    );
    expect(translateAuthError("weak password detected")).toBe(
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.",
    );
    expect(translateAuthError("password strength check failed")).toBe(
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.",
    );
  });

  it("handles expired token", () => {
    const expected = "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("token expired")).toBe(expected);
    expect(translateAuthError("expired token error")).toBe(expected);
  });

  it("handles invalid token", () => {
    expect(translateAuthError("invalid token")).toBe(
      "Tautan tidak valid atau sudah digunakan.",
    );
  });

  it("returns fallback for unknown errors", () => {
    expect(translateAuthError("Some random unknown error")).toBe(
      "Some random unknown error",
    );
    expect(translateAuthError("UnknownError: 500")).toBe("UnknownError: 500");
  });
});
