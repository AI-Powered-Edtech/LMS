import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("returns fallback for empty message", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
    expect(translateAuthError(null as any)).toBe("Terjadi kesalahan yang tidak diketahui.");
    expect(translateAuthError(undefined as any)).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("handles network errors", () => {
    const expected = "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("Failed to fetch")).toBe(expected);
    expect(translateAuthError("NetworkError when attempting to fetch resource.")).toBe(expected);
    expect(translateAuthError("Load failed")).toBe(expected);
    expect(translateAuthError("CORS error")).toBe(expected);
    expect(translateAuthError("Cross-origin blocked")).toBe(expected);
    expect(translateAuthError("Mixed Content")).toBe(expected);
  });

  it("handles invalid credentials", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("Invalid login credentials")).toBe(expected);
    expect(translateAuthError("invalid_credentials")).toBe(expected);
  });

  it("handles email not confirmed", () => {
    expect(translateAuthError("Email not confirmed")).toBe("Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.");
  });

  it("handles rate limits", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("too many requests")).toBe(expected);
    expect(translateAuthError("rate limit exceeded")).toBe(expected);
  });

  it("handles user not found", () => {
    expect(translateAuthError("user not found")).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");
  });

  it("handles user already registered", () => {
    const expected = "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("User already registered")).toBe(expected);
    expect(translateAuthError("User already exists")).toBe(expected);
  });

  it("handles weak passwords", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe("Kata sandi terlalu pendek. Gunakan minimal 6 karakter.");
    const expectedWeak = "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.";
    expect(translateAuthError("Weak password")).toBe(expectedWeak);
    expect(translateAuthError("Password strength is too low")).toBe(expectedWeak);
  });

  it("handles token expiration and invalidation", () => {
    const expectedExp = "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("Token expired")).toBe(expectedExp);
    expect(translateAuthError("Expired token")).toBe(expectedExp);
    expect(translateAuthError("Invalid token")).toBe("Tautan tidak valid atau sudah digunakan.");
  });

  it("returns raw message for unknown errors", () => {
    expect(translateAuthError("Something completely unexpected happened")).toBe("Something completely unexpected happened");
  });
});
