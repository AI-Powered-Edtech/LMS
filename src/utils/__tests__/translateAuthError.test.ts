import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should return fallback for empty string or null/undefined equivalent", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("should handle network errors", () => {
    const networkErrors = [
      "Failed to fetch",
      "NetworkError",
      "Load failed",
      "CORS error",
      "Cross-origin request blocked",
      "Mixed content blocked"
    ];
    networkErrors.forEach(err => {
      expect(translateAuthError(err)).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    });
  });

  it("should handle invalid credentials", () => {
    expect(translateAuthError("Invalid login credentials")).toBe("Email atau kata sandi salah. Silakan coba lagi.");
    expect(translateAuthError("invalid_credentials")).toBe("Email atau kata sandi salah. Silakan coba lagi.");
  });

  it("should handle unconfirmed email", () => {
    expect(translateAuthError("Email not confirmed")).toBe("Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.");
  });

  it("should handle rate limiting", () => {
    expect(translateAuthError("Too many requests")).toBe("Terlalu banyak percobaan. Silakan tunggu beberapa saat.");
    expect(translateAuthError("Rate limit exceeded")).toBe("Terlalu banyak percobaan. Silakan tunggu beberapa saat.");
  });

  it("should handle user not found", () => {
    expect(translateAuthError("User not found")).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");
  });

  it("should handle already registered user", () => {
    expect(translateAuthError("User already registered")).toBe("Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
    expect(translateAuthError("Account already exists")).toBe("Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
  });

  it("should handle password length errors", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe("Kata sandi terlalu pendek. Gunakan minimal 6 karakter.");
  });

  it("should handle weak password errors", () => {
    expect(translateAuthError("Weak password")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
    expect(translateAuthError("Password strength is too low")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
  });

  it("should handle expired token", () => {
    expect(translateAuthError("Token expired")).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
    expect(translateAuthError("Expired token")).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
  });

  it("should handle invalid token", () => {
    expect(translateAuthError("Invalid token")).toBe("Tautan tidak valid atau sudah digunakan.");
  });

  it("should return the original message if unknown", () => {
    expect(translateAuthError("Some random error message")).toBe("Some random error message");
  });
});
