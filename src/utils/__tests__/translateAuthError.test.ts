import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should handle empty or undefined messages", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("should translate network errors", () => {
    const expected = "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("failed to fetch")).toBe(expected);
    expect(translateAuthError("networkerror")).toBe(expected);
    expect(translateAuthError("load failed")).toBe(expected);
    expect(translateAuthError("cors")).toBe(expected);
    expect(translateAuthError("cross-origin")).toBe(expected);
    expect(translateAuthError("mixed content")).toBe(expected);
    // case insensitivity
    expect(translateAuthError("FAILED to FETCH")).toBe(expected);
  });

  it("should translate invalid credentials errors", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("invalid login credentials")).toBe(expected);
    expect(translateAuthError("invalid_credentials")).toBe(expected);
  });

  it("should translate unconfirmed email errors", () => {
    const expected = "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.";
    expect(translateAuthError("email not confirmed")).toBe(expected);
  });

  it("should translate rate limiting errors", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("too many requests")).toBe(expected);
    expect(translateAuthError("rate limit")).toBe(expected);
  });

  it("should translate user not found errors", () => {
    const expected = "Akun tidak ditemukan. Pastikan email yang dimasukkan benar.";
    expect(translateAuthError("user not found")).toBe(expected);
  });

  it("should translate user already registered errors", () => {
    const expected = "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("user already registered")).toBe(expected);
    expect(translateAuthError("already exists")).toBe(expected);
  });

  it("should translate password too short errors", () => {
    const expected = "Kata sandi terlalu pendek. Gunakan minimal 6 karakter.";
    expect(translateAuthError("password should be at least")).toBe(expected);
  });

  it("should translate weak password errors", () => {
    const expected = "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.";
    expect(translateAuthError("weak password")).toBe(expected);
    expect(translateAuthError("password strength")).toBe(expected);
  });

  it("should translate expired token errors", () => {
    const expected = "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("token expired")).toBe(expected);
    expect(translateAuthError("expired token")).toBe(expected);
  });

  it("should translate invalid token errors", () => {
    const expected = "Tautan tidak valid atau sudah digunakan.";
    expect(translateAuthError("invalid token")).toBe(expected);
  });

  it("should fallback to raw message if unknown", () => {
    expect(translateAuthError("SOME_RANDOM_ERROR")).toBe("SOME_RANDOM_ERROR");
  });
});
