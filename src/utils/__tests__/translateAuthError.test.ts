import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should return default message for falsy inputs", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("should translate network errors", () => {
    const expected = "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("Failed to fetch")).toBe(expected);
    expect(translateAuthError("NetworkError")).toBe(expected);
    expect(translateAuthError("Load failed")).toBe(expected);
    expect(translateAuthError("CORS")).toBe(expected);
    expect(translateAuthError("Cross-Origin")).toBe(expected);
    expect(translateAuthError("Mixed Content")).toBe(expected);
  });

  it("should translate authentication and user errors", () => {
    expect(translateAuthError("Invalid login credentials")).toBe("Email atau kata sandi salah. Silakan coba lagi.");
    expect(translateAuthError("invalid_credentials")).toBe("Email atau kata sandi salah. Silakan coba lagi.");

    expect(translateAuthError("Email not confirmed")).toBe("Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.");

    expect(translateAuthError("User not found")).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");

    expect(translateAuthError("User already registered")).toBe("Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
    expect(translateAuthError("User already exists")).toBe("Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
  });

  it("should translate rate limiting errors", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("Too many requests")).toBe(expected);
    expect(translateAuthError("Rate limit exceeded")).toBe(expected);
  });

  it("should translate password errors", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe("Kata sandi terlalu pendek. Gunakan minimal 6 karakter.");
    expect(translateAuthError("Weak password")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
    expect(translateAuthError("Password strength is weak")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
  });

  it("should translate token errors", () => {
    expect(translateAuthError("Token expired")).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
    expect(translateAuthError("Expired token")).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
    expect(translateAuthError("Invalid token")).toBe("Tautan tidak valid atau sudah digunakan.");
  });

  it("should return the original message for unknown errors", () => {
    const unknownError = "Some weird unexpected database error";
    expect(translateAuthError(unknownError)).toBe(unknownError);
  });
});
