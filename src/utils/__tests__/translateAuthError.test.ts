import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should handle network and connection errors", () => {
    expect(translateAuthError("failed to fetch")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.",
    );
    expect(
      translateAuthError("NetworkError when attempting to fetch resource."),
    ).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.",
    );
    expect(translateAuthError("Load failed")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.",
    );
    expect(translateAuthError("CORS error")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.",
    );
    expect(translateAuthError("Cross-Origin Request Blocked")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.",
    );
    expect(translateAuthError("Mixed Content")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.",
    );
  });

  it("should handle invalid credentials", () => {
    expect(translateAuthError("Invalid login credentials")).toBe(
      "Email atau kata sandi salah. Silakan coba lagi.",
    );
    expect(translateAuthError("invalid_credentials")).toBe(
      "Email atau kata sandi salah. Silakan coba lagi.",
    );
  });

  it("should handle email not confirmed", () => {
    expect(translateAuthError("Email not confirmed")).toBe(
      "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.",
    );
  });

  it("should handle rate limiting", () => {
    expect(translateAuthError("Too many requests")).toBe(
      "Terlalu banyak percobaan. Silakan tunggu beberapa saat.",
    );
    expect(translateAuthError("Rate limit exceeded")).toBe(
      "Terlalu banyak percobaan. Silakan tunggu beberapa saat.",
    );
  });

  it("should handle user not found", () => {
    expect(translateAuthError("User not found")).toBe(
      "Akun tidak ditemukan. Pastikan email yang dimasukkan benar.",
    );
  });

  it("should handle user already registered", () => {
    expect(translateAuthError("User already registered")).toBe(
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.",
    );
    expect(translateAuthError("User already exists")).toBe(
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.",
    );
  });

  it("should handle password length errors", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe(
      "Kata sandi terlalu pendek. Gunakan minimal 6 karakter.",
    );
  });

  it("should handle weak password errors", () => {
    expect(translateAuthError("Weak password")).toBe(
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.",
    );
    expect(translateAuthError("Password strength is too low")).toBe(
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.",
    );
  });

  it("should handle token expired", () => {
    expect(translateAuthError("Token expired")).toBe(
      "Tautan sudah kedaluwarsa. Silakan minta tautan baru.",
    );
    expect(translateAuthError("Expired token")).toBe(
      "Tautan sudah kedaluwarsa. Silakan minta tautan baru.",
    );
  });

  it("should handle invalid token", () => {
    expect(translateAuthError("Invalid token")).toBe(
      "Tautan tidak valid atau sudah digunakan.",
    );
  });

  it("should fallback to raw message for unknown errors", () => {
    expect(translateAuthError("Some completely unknown error")).toBe(
      "Some completely unknown error",
    );
  });

  it("should handle case insensitivity", () => {
    expect(translateAuthError("FaIlEd To FeTcH")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.",
    );
    expect(translateAuthError("INVALID LOGIN CREDENTIALS")).toBe(
      "Email atau kata sandi salah. Silakan coba lagi.",
    );
  });

  it("should handle empty string, null, or undefined", () => {
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
});
