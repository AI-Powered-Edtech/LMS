import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should handle empty or undefined messages", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error - testing invalid input type
    expect(translateAuthError(null)).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error - testing invalid input type
    expect(translateAuthError(undefined)).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("should translate network and connection errors", () => {
    const expected = "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("failed to fetch data")).toBe(expected);
    expect(translateAuthError("NetworkError when attempting to fetch resource.")).toBe(expected);
    expect(translateAuthError("Load failed")).toBe(expected);
    expect(translateAuthError("CORS policy violation")).toBe(expected);
    expect(translateAuthError("Cross-Origin Request Blocked")).toBe(expected);
    expect(translateAuthError("Mixed Content: The page was loaded over HTTPS")).toBe(expected);
  });

  it("should translate invalid login credentials", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("Invalid login credentials")).toBe(expected);
    expect(translateAuthError("invalid_credentials provided")).toBe(expected);
  });

  it("should translate unconfirmed email", () => {
    expect(translateAuthError("Email not confirmed")).toBe(
      "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda."
    );
  });

  it("should translate rate limiting and too many requests", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("Too many requests")).toBe(expected);
    expect(translateAuthError("Rate limit exceeded")).toBe(expected);
  });

  it("should translate user not found", () => {
    expect(translateAuthError("User not found in the database")).toBe(
      "Akun tidak ditemukan. Pastikan email yang dimasukkan benar."
    );
  });

  it("should translate user already registered", () => {
    const expected = "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("User already registered")).toBe(expected);
    expect(translateAuthError("Account already exists")).toBe(expected);
  });

  it("should translate short password error", () => {
    expect(translateAuthError("Password should be at least 8 characters")).toBe(
      "Kata sandi terlalu pendek. Gunakan minimal 6 karakter."
    );
  });

  it("should translate weak password error", () => {
    const expected = "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.";
    expect(translateAuthError("Weak password detected")).toBe(expected);
    expect(translateAuthError("Password strength is insufficient")).toBe(expected);
  });

  it("should translate expired token error", () => {
    const expected = "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("Token expired")).toBe(expected);
    expect(translateAuthError("Expired token provided")).toBe(expected);
  });

  it("should translate invalid token error", () => {
    expect(translateAuthError("Invalid token supplied")).toBe(
      "Tautan tidak valid atau sudah digunakan."
    );
  });

  it("should return the raw message as fallback if unknown", () => {
    const unknownMessage = "Some random unseen error occurred from backend";
    expect(translateAuthError(unknownMessage)).toBe(unknownMessage);
  });

  it("should handle mixed case messages", () => {
    expect(translateAuthError("INVALID LOGIN CREDENTIALS")).toBe(
      "Email atau kata sandi salah. Silakan coba lagi."
    );
    expect(translateAuthError("UsEr AlReAdY ReGiStErEd")).toBe(
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk."
    );
  });
});
