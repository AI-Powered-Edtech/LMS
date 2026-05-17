import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should handle empty or null messages", () => {
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe("Terjadi kesalahan yang tidak diketahui.");
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("should translate network connection errors", () => {
    const expected = "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("Failed to fetch")).toBe(expected);
    expect(translateAuthError("NetworkError when attempting to fetch resource.")).toBe(expected);
    expect(translateAuthError("Load failed")).toBe(expected);
    expect(translateAuthError("CORS error")).toBe(expected);
    expect(translateAuthError("cross-origin request blocked")).toBe(expected);
    expect(translateAuthError("Mixed Content error")).toBe(expected);
  });

  it("should translate invalid credentials errors", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("invalid login credentials")).toBe(expected);
    expect(translateAuthError("invalid_credentials")).toBe(expected);
  });

  it("should translate unconfirmed email errors", () => {
    expect(translateAuthError("Email not confirmed")).toBe("Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.");
  });

  it("should translate rate limit errors", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("Too many requests")).toBe(expected);
    expect(translateAuthError("rate limit exceeded")).toBe(expected);
  });

  it("should translate user not found errors", () => {
    expect(translateAuthError("User not found")).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");
  });

  it("should translate user already registered errors", () => {
    const expected = "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("User already registered")).toBe(expected);
    expect(translateAuthError("User already exists")).toBe(expected);
  });

  it("should translate short password errors", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe("Kata sandi terlalu pendek. Gunakan minimal 6 karakter.");
  });

  it("should translate weak password errors", () => {
    const expected = "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.";
    expect(translateAuthError("weak password")).toBe(expected);
    expect(translateAuthError("Password strength is weak")).toBe(expected);
  });

  it("should translate expired token errors", () => {
    const expected = "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("Token expired")).toBe(expected);
    expect(translateAuthError("expired token")).toBe(expected);
  });

  it("should translate invalid token errors", () => {
    expect(translateAuthError("Invalid token")).toBe("Tautan tidak valid atau sudah digunakan.");
  });

  it("should return the original message if not matched", () => {
    expect(translateAuthError("Some random obscure error that is not mapped")).toBe("Some random obscure error that is not mapped");
  });
});
