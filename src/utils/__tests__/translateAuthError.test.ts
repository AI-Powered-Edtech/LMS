import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should return default message for empty input", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("should translate network errors", () => {
    const expected = "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("Failed to fetch data")).toBe(expected);
    expect(translateAuthError("NetworkError when attempting to fetch resource.")).toBe(expected);
    expect(translateAuthError("Load failed")).toBe(expected);
    expect(translateAuthError("CORS policy violation")).toBe(expected);
    expect(translateAuthError("Cross-Origin Request Blocked")).toBe(expected);
    expect(translateAuthError("Mixed Content error")).toBe(expected);
  });

  it("should translate invalid credentials", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("Invalid login credentials")).toBe(expected);
    expect(translateAuthError("invalid_credentials")).toBe(expected);
  });

  it("should translate unconfirmed email", () => {
    expect(translateAuthError("Email not confirmed")).toBe("Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.");
  });

  it("should translate rate limits", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("Too many requests from this IP")).toBe(expected);
    expect(translateAuthError("Rate limit exceeded")).toBe(expected);
  });

  it("should translate user not found", () => {
    expect(translateAuthError("User not found in the database")).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");
  });

  it("should translate user already exists", () => {
    const expected = "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("User already registered")).toBe(expected);
    expect(translateAuthError("User already exists")).toBe(expected);
  });

  it("should translate weak passwords", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe("Kata sandi terlalu pendek. Gunakan minimal 6 karakter.");
    expect(translateAuthError("Weak password")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
    expect(translateAuthError("Password strength is too low")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
  });

  it("should translate invalid/expired tokens", () => {
    expect(translateAuthError("Token expired")).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
    expect(translateAuthError("Expired token")).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
    expect(translateAuthError("Invalid token")).toBe("Tautan tidak valid atau sudah digunakan.");
  });

  it("should return raw message if unknown", () => {
    expect(translateAuthError("Some random error")).toBe("Some random error");
  });
});
