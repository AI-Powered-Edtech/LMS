import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should return default message for empty or undefined input", () => {
    expect(translateAuthError("")).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    // @ts-expect-error Testing invalid input
    expect(translateAuthError(null)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    // @ts-expect-error Testing invalid input
    expect(translateAuthError(undefined)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
  });

  it("should translate network errors", () => {
    const expected =
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("Failed to fetch data")).toBe(expected);
    expect(translateAuthError("NetworkError occurred")).toBe(expected);
    expect(translateAuthError("Resource load failed")).toBe(expected);
    expect(translateAuthError("CORS policy violation")).toBe(expected);
    expect(translateAuthError("Cross-Origin request blocked")).toBe(expected);
    expect(translateAuthError("Blocked mixed content")).toBe(expected);
  });

  it("should translate invalid credentials errors", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("Invalid login credentials")).toBe(expected);
    expect(translateAuthError("Error: invalid_credentials")).toBe(expected);
  });

  it("should translate email not confirmed error", () => {
    expect(translateAuthError("Email not confirmed")).toBe(
      "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.",
    );
  });

  it("should translate rate limit errors", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("Too many requests")).toBe(expected);
    expect(translateAuthError("Rate limit exceeded")).toBe(expected);
  });

  it("should translate user not found error", () => {
    expect(translateAuthError("User not found")).toBe(
      "Akun tidak ditemukan. Pastikan email yang dimasukkan benar.",
    );
  });

  it("should translate user already registered errors", () => {
    const expected =
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("User already registered")).toBe(expected);
    expect(translateAuthError("Email already exists")).toBe(expected);
  });

  it("should translate weak password errors", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe(
      "Kata sandi terlalu pendek. Gunakan minimal 6 karakter.",
    );
    expect(translateAuthError("Weak password")).toBe(
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.",
    );
    expect(translateAuthError("Insufficient password strength")).toBe(
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.",
    );
  });

  it("should translate token errors", () => {
    expect(translateAuthError("Token expired")).toBe(
      "Tautan sudah kedaluwarsa. Silakan minta tautan baru.",
    );
    expect(translateAuthError("Expired token")).toBe(
      "Tautan sudah kedaluwarsa. Silakan minta tautan baru.",
    );
    expect(translateAuthError("Invalid token")).toBe(
      "Tautan tidak valid atau sudah digunakan.",
    );
  });

  it("should return the original message if no match is found", () => {
    const customError = "Some entirely unknown and custom error message";
    expect(translateAuthError(customError)).toBe(customError);
  });
});
