import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should return default message for empty or null input", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("should handle network errors", () => {
    const networkErrors = [
      "failed to fetch",
      "NetworkError when attempting to fetch resource.",
      "The load failed",
      "CORS error",
      "Cross-origin request blocked",
      "Blocked mixed content",
    ];

    networkErrors.forEach((error) => {
      expect(translateAuthError(error)).toBe(
        "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi."
      );
    });
  });

  it("should handle invalid credentials", () => {
    expect(translateAuthError("Invalid login credentials")).toBe(
      "Email atau kata sandi salah. Silakan coba lagi."
    );
    expect(translateAuthError("invalid_credentials")).toBe(
      "Email atau kata sandi salah. Silakan coba lagi."
    );
  });

  it("should handle unconfirmed email", () => {
    expect(translateAuthError("Email not confirmed")).toBe(
      "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda."
    );
  });

  it("should handle rate limiting", () => {
    expect(translateAuthError("Too many requests")).toBe(
      "Terlalu banyak percobaan. Silakan tunggu beberapa saat."
    );
    expect(translateAuthError("Rate limit exceeded")).toBe(
      "Terlalu banyak percobaan. Silakan tunggu beberapa saat."
    );
  });

  it("should handle user not found", () => {
    expect(translateAuthError("User not found in database")).toBe(
      "Akun tidak ditemukan. Pastikan email yang dimasukkan benar."
    );
  });

  it("should handle user already registered", () => {
    expect(translateAuthError("User already registered")).toBe(
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk."
    );
    expect(translateAuthError("User already exists")).toBe(
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk."
    );
  });

  it("should handle short passwords", () => {
    expect(translateAuthError("Password should be at least 8 characters")).toBe(
      "Kata sandi terlalu pendek. Gunakan minimal 6 karakter."
    );
  });

  it("should handle weak passwords", () => {
    expect(translateAuthError("Weak password")).toBe(
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka."
    );
    expect(translateAuthError("Insufficient password strength")).toBe(
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka."
    );
  });

  it("should handle expired tokens", () => {
    expect(translateAuthError("Token expired")).toBe(
      "Tautan sudah kedaluwarsa. Silakan minta tautan baru."
    );
    expect(translateAuthError("The expired token cannot be used")).toBe(
      "Tautan sudah kedaluwarsa. Silakan minta tautan baru."
    );
  });

  it("should handle invalid tokens", () => {
    expect(translateAuthError("Invalid token provided")).toBe(
      "Tautan tidak valid atau sudah digunakan."
    );
  });

  it("should return the raw message as fallback if unknown", () => {
    const unknownError = "Some unexpected database error occurred.";
    expect(translateAuthError(unknownError)).toBe(unknownError);
  });
});
