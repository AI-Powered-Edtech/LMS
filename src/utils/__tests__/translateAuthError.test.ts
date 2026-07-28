import { describe, expect,it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should handle empty or null messages", () => {
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    expect(translateAuthError("")).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
  });

  it("should translate network errors", () => {
    const expected =
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("Failed to fetch data")).toBe(expected);
    expect(translateAuthError("NetworkError occurred")).toBe(expected);
    expect(translateAuthError("Load failed due to network")).toBe(expected);
    expect(translateAuthError("CORS policy violation")).toBe(expected);
    expect(translateAuthError("Cross-origin request blocked")).toBe(expected);
    expect(translateAuthError("Mixed content warning")).toBe(expected);
  });

  it("should translate credential errors", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("Invalid login credentials")).toBe(expected);
    expect(translateAuthError("invalid_credentials")).toBe(expected);
  });

  it("should translate unconfirmed email error", () => {
    expect(translateAuthError("Email not confirmed for this user")).toBe(
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

  it("should translate short password error", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe(
      "Kata sandi terlalu pendek. Gunakan minimal 6 karakter.",
    );
  });

  it("should translate weak password errors", () => {
    const expected =
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.";
    expect(translateAuthError("Weak password")).toBe(expected);
    expect(translateAuthError("Password strength is too low")).toBe(expected);
  });

  it("should translate expired token errors", () => {
    const expected = "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("Token expired")).toBe(expected);
    expect(translateAuthError("Expired token")).toBe(expected);
  });

  it("should translate invalid token error", () => {
    expect(translateAuthError("Invalid token")).toBe(
      "Tautan tidak valid atau sudah digunakan.",
    );
  });

  it("should return the raw message if it is unknown", () => {
    expect(translateAuthError("Some random unknown error")).toBe(
      "Some random unknown error",
    );
    expect(translateAuthError("Internal server error 500")).toBe(
      "Internal server error 500",
    );
  });
});
