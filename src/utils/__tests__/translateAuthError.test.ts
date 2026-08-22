import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should return default message for empty input", () => {
    expect(translateAuthError("")).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    expect(translateAuthError(null as unknown as string)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    expect(translateAuthError(undefined as unknown as string)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
  });

  it("should handle network errors", () => {
    const expected =
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("Failed to fetch data")).toBe(expected);
    expect(
      translateAuthError("NetworkError when attempting to fetch resource"),
    ).toBe(expected);
    expect(translateAuthError("load failed")).toBe(expected);
    expect(translateAuthError("CORS error")).toBe(expected);
    expect(translateAuthError("cross-origin request blocked")).toBe(expected);
    expect(translateAuthError("mixed content blocked")).toBe(expected);
  });

  it("should handle invalid credentials", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("Invalid login credentials")).toBe(expected);
    expect(translateAuthError("invalid_credentials")).toBe(expected);
  });

  it("should handle unconfirmed email", () => {
    expect(translateAuthError("Email not confirmed")).toBe(
      "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.",
    );
  });

  it("should handle rate limits", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("Too many requests from this IP")).toBe(expected);
    expect(translateAuthError("rate limit exceeded")).toBe(expected);
  });

  it("should handle user not found", () => {
    expect(translateAuthError("User not found in the system")).toBe(
      "Akun tidak ditemukan. Pastikan email yang dimasukkan benar.",
    );
  });

  it("should handle already registered user", () => {
    const expected =
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("User already registered")).toBe(expected);
    expect(translateAuthError("Email already exists")).toBe(expected);
  });

  it("should handle short password", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe(
      "Kata sandi terlalu pendek. Gunakan minimal 6 karakter.",
    );
  });

  it("should handle weak password", () => {
    const expected =
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.";
    expect(translateAuthError("Weak password")).toBe(expected);
    expect(translateAuthError("Password strength is too weak")).toBe(expected);
  });

  it("should handle expired token", () => {
    const expected = "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("Token expired")).toBe(expected);
    expect(translateAuthError("Expired token")).toBe(expected);
  });

  it("should handle invalid token", () => {
    expect(translateAuthError("Invalid token")).toBe(
      "Tautan tidak valid atau sudah digunakan.",
    );
  });

  it("should return original message for unknown errors", () => {
    expect(translateAuthError("Some random unknown error")).toBe(
      "Some random unknown error",
    );
  });

  it("should be case insensitive", () => {
    expect(translateAuthError("FAILed To FETch")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.",
    );
    expect(translateAuthError("INVALID LOGIN CREDENTIALS")).toBe(
      "Email atau kata sandi salah. Silakan coba lagi.",
    );
  });
});
