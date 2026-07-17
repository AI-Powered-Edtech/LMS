import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should return generic error for empty string", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("should translate network errors", () => {
    expect(translateAuthError("Failed to fetch")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("NetworkError when attempting to fetch resource.")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("Load failed")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("CORS policy")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("cross-origin")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("mixed content")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
  });

  it("should translate invalid credentials errors", () => {
    expect(translateAuthError("Invalid login credentials")).toBe("Email atau kata sandi salah. Silakan coba lagi.");
    expect(translateAuthError("invalid_credentials")).toBe("Email atau kata sandi salah. Silakan coba lagi.");
  });

  it("should translate unconfirmed email errors", () => {
    expect(translateAuthError("Email not confirmed")).toBe("Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.");
  });

  it("should translate rate limit errors", () => {
    expect(translateAuthError("Too many requests")).toBe("Terlalu banyak percobaan. Silakan tunggu beberapa saat.");
    expect(translateAuthError("Rate limit exceeded")).toBe("Terlalu banyak percobaan. Silakan tunggu beberapa saat.");
  });

  it("should translate user not found errors", () => {
    expect(translateAuthError("User not found")).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");
  });

  it("should translate user already registered errors", () => {
    expect(translateAuthError("User already registered")).toBe("Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
    expect(translateAuthError("User already exists")).toBe("Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
  });

  it("should translate password constraints errors", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe("Kata sandi terlalu pendek. Gunakan minimal 6 karakter.");
    expect(translateAuthError("Weak password")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
    expect(translateAuthError("Password strength is weak")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
  });

  it("should translate token errors", () => {
    expect(translateAuthError("Token expired")).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
    expect(translateAuthError("Expired token")).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
    expect(translateAuthError("Invalid token")).toBe("Tautan tidak valid atau sudah digunakan.");
  });

  it("should return raw message for unknown errors", () => {
    expect(translateAuthError("Unknown server error occurred")).toBe("Unknown server error occurred");
  });
});
