import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should return fallback for falsy values", () => {
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe("Terjadi kesalahan yang tidak diketahui.");
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("should translate network errors", () => {
    expect(translateAuthError("failed to fetch")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("NetworkError when attempting to fetch resource")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("load failed")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("cors error")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("Cross-Origin Request Blocked")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("Mixed Content")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
  });

  it("should translate login credential errors", () => {
    expect(translateAuthError("invalid login credentials")).toBe("Email atau kata sandi salah. Silakan coba lagi.");
    expect(translateAuthError("invalid_credentials")).toBe("Email atau kata sandi salah. Silakan coba lagi.");
  });

  it("should translate email not confirmed", () => {
    expect(translateAuthError("email not confirmed")).toBe("Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.");
  });

  it("should translate rate limit errors", () => {
    expect(translateAuthError("too many requests")).toBe("Terlalu banyak percobaan. Silakan tunggu beberapa saat.");
    expect(translateAuthError("rate limit exceeded")).toBe("Terlalu banyak percobaan. Silakan tunggu beberapa saat.");
  });

  it("should translate user not found", () => {
    expect(translateAuthError("user not found")).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");
  });

  it("should translate user already registered", () => {
    expect(translateAuthError("user already registered")).toBe("Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
    expect(translateAuthError("User already exists")).toBe("Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
  });

  it("should translate password too short", () => {
    expect(translateAuthError("password should be at least 6 characters")).toBe("Kata sandi terlalu pendek. Gunakan minimal 6 karakter.");
  });

  it("should translate weak password", () => {
    expect(translateAuthError("weak password")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
    expect(translateAuthError("password strength is weak")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
  });

  it("should translate token expired", () => {
    expect(translateAuthError("token expired")).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
    expect(translateAuthError("expired token")).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
  });

  it("should translate invalid token", () => {
    expect(translateAuthError("invalid token")).toBe("Tautan tidak valid atau sudah digunakan.");
  });

  it("should be case insensitive", () => {
    expect(translateAuthError("INVALID LOGIN CREDENTIALS")).toBe("Email atau kata sandi salah. Silakan coba lagi.");
    expect(translateAuthError("FaileD To FeTch")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
  });

  it("should return the original message for unknown errors", () => {
    expect(translateAuthError("some unknown error message")).toBe("some unknown error message");
  });
});
