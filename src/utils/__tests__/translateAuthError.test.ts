import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should return generic error for empty string", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("should return generic error for null/undefined", () => {
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("should translate network errors", () => {
    expect(translateAuthError("failed to fetch")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("NetworkError")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("load failed")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("CORS")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("cross-origin")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("mixed content")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
  });

  it("should translate login errors", () => {
    expect(translateAuthError("invalid login credentials")).toBe("Email atau kata sandi salah. Silakan coba lagi.");
    expect(translateAuthError("invalid_credentials")).toBe("Email atau kata sandi salah. Silakan coba lagi.");
  });

  it("should translate unconfirmed email error", () => {
    expect(translateAuthError("email not confirmed")).toBe("Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.");
  });

  it("should translate rate limit errors", () => {
    expect(translateAuthError("too many requests")).toBe("Terlalu banyak percobaan. Silakan tunggu beberapa saat.");
    expect(translateAuthError("rate limit")).toBe("Terlalu banyak percobaan. Silakan tunggu beberapa saat.");
  });

  it("should translate user not found error", () => {
    expect(translateAuthError("user not found")).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");
  });

  it("should translate user already exists errors", () => {
    expect(translateAuthError("user already registered")).toBe("Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
    expect(translateAuthError("already exists")).toBe("Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
  });

  it("should translate short password error", () => {
    expect(translateAuthError("password should be at least")).toBe("Kata sandi terlalu pendek. Gunakan minimal 6 karakter.");
  });

  it("should translate weak password error", () => {
    expect(translateAuthError("weak password")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
    expect(translateAuthError("password strength")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
  });

  it("should translate expired token errors", () => {
    expect(translateAuthError("token expired")).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
    expect(translateAuthError("expired token")).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
  });

  it("should translate invalid token error", () => {
    expect(translateAuthError("invalid token")).toBe("Tautan tidak valid atau sudah digunakan.");
  });

  it("should return the original message if unknown", () => {
    expect(translateAuthError("Some random unknown error")).toBe("Some random unknown error");
  });

  it("should be case insensitive", () => {
    expect(translateAuthError("FaileD To FetcH")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("INVALID LOGIN CREDENTIALS")).toBe("Email atau kata sandi salah. Silakan coba lagi.");
  });
});
