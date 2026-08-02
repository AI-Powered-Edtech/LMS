import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should return a generic message for empty or undefined input", () => {
    expect(translateAuthError("")).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    expect(translateAuthError(undefined as unknown as string)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
  });

  it("should translate network errors", () => {
    const expected =
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("Failed to fetch data")).toBe(expected);
    expect(translateAuthError("NetworkError occurred")).toBe(expected);
    expect(translateAuthError("load failed")).toBe(expected);
    expect(translateAuthError("CORS issue")).toBe(expected);
    expect(translateAuthError("cross-origin request blocked")).toBe(expected);
    expect(translateAuthError("mixed content warning")).toBe(expected);
  });

  it("should translate invalid credentials", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("invalid login credentials")).toBe(expected);
    expect(translateAuthError("invalid_credentials")).toBe(expected);
  });

  it("should translate email not confirmed", () => {
    expect(translateAuthError("Email not confirmed")).toBe(
      "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.",
    );
  });

  it("should translate rate limiting", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("too many requests")).toBe(expected);
    expect(translateAuthError("rate limit exceeded")).toBe(expected);
  });

  it("should translate user not found", () => {
    expect(translateAuthError("User not found in database")).toBe(
      "Akun tidak ditemukan. Pastikan email yang dimasukkan benar.",
    );
  });

  it("should translate user already registered", () => {
    const expected =
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("User already registered")).toBe(expected);
    expect(translateAuthError("User already exists")).toBe(expected);
  });

  it("should translate short password", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe(
      "Kata sandi terlalu pendek. Gunakan minimal 6 karakter.",
    );
  });

  it("should translate weak password", () => {
    const expected =
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.";
    expect(translateAuthError("Weak password")).toBe(expected);
    expect(translateAuthError("Password strength is low")).toBe(expected);
  });

  it("should translate expired token", () => {
    const expected = "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("Token expired")).toBe(expected);
    expect(translateAuthError("expired token")).toBe(expected);
  });

  it("should translate invalid token", () => {
    expect(translateAuthError("Invalid token")).toBe(
      "Tautan tidak valid atau sudah digunakan.",
    );
  });

  it("should handle case insensitivity", () => {
    expect(translateAuthError("FAILED TO FETCH")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.",
    );
  });

  it("should fallback to original message for unknown errors", () => {
    const unknownError = "Something completely different";
    expect(translateAuthError(unknownError)).toBe(unknownError);
  });
});
