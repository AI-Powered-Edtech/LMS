import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should handle network and connection errors", () => {
    expect(translateAuthError("Failed to fetch data")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi."
    );
    expect(translateAuthError("NetworkError when attempting to fetch resource")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi."
    );
    expect(translateAuthError("load failed")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi."
    );
    expect(translateAuthError("CORS policy violation")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi."
    );
    expect(translateAuthError("Cross-origin request blocked")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi."
    );
    expect(translateAuthError("mixed content error")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi."
    );
  });

  it("should handle invalid credentials errors", () => {
    expect(translateAuthError("Invalid login credentials")).toBe(
      "Email atau kata sandi salah. Silakan coba lagi."
    );
    expect(translateAuthError("invalid_credentials")).toBe(
      "Email atau kata sandi salah. Silakan coba lagi."
    );
  });

  it("should handle unconfirmed email errors", () => {
    expect(translateAuthError("email not confirmed")).toBe(
      "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda."
    );
  });

  it("should handle rate limiting errors", () => {
    expect(translateAuthError("Too many requests from this IP")).toBe(
      "Terlalu banyak percobaan. Silakan tunggu beberapa saat."
    );
    expect(translateAuthError("Rate limit exceeded")).toBe(
      "Terlalu banyak percobaan. Silakan tunggu beberapa saat."
    );
  });

  it("should handle user not found errors", () => {
    expect(translateAuthError("user not found in the database")).toBe(
      "Akun tidak ditemukan. Pastikan email yang dimasukkan benar."
    );
  });

  it("should handle user already registered errors", () => {
    expect(translateAuthError("user already registered with this email")).toBe(
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk."
    );
    expect(translateAuthError("Email already exists")).toBe(
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk."
    );
  });

  it("should handle password strength errors", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe(
      "Kata sandi terlalu pendek. Gunakan minimal 6 karakter."
    );
    expect(translateAuthError("weak password provided")).toBe(
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka."
    );
    expect(translateAuthError("Password strength is too low")).toBe(
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka."
    );
  });

  it("should handle token errors", () => {
    expect(translateAuthError("The token expired an hour ago")).toBe(
      "Tautan sudah kedaluwarsa. Silakan minta tautan baru."
    );
    expect(translateAuthError("Expired token provided")).toBe(
      "Tautan sudah kedaluwarsa. Silakan minta tautan baru."
    );
    expect(translateAuthError("Invalid token")).toBe(
      "Tautan tidak valid atau sudah digunakan."
    );
  });

  it("should return raw message as fallback for unknown errors", () => {
    expect(translateAuthError("Some completely unknown server error")).toBe(
      "Some completely unknown server error"
    );
  });

  it("should handle edge cases like empty string, null, and undefined", () => {
    expect(translateAuthError("")).toBe(
      "Terjadi kesalahan yang tidak diketahui."
    );

    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe(
      "Terjadi kesalahan yang tidak diketahui."
    );

    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe(
      "Terjadi kesalahan yang tidak diketahui."
    );
  });
});
