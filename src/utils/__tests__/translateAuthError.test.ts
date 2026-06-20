import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("returns default message for empty or falsy strings", () => {
    expect(translateAuthError("")).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
  });

  it("handles network and fetch errors", () => {
    const expected =
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("Failed to fetch")).toBe(expected);
    expect(translateAuthError("NetworkError when attempting to fetch resource")).toBe(expected);
    expect(translateAuthError("load failed")).toBe(expected);
    expect(translateAuthError("cors error")).toBe(expected);
    expect(translateAuthError("cross-origin request blocked")).toBe(expected);
    expect(translateAuthError("mixed content blocked")).toBe(expected);
  });

  it("handles invalid credentials", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("invalid login credentials")).toBe(expected);
    expect(translateAuthError("invalid_credentials")).toBe(expected);
  });

  it("handles unconfirmed email", () => {
    expect(translateAuthError("email not confirmed")).toBe(
      "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.",
    );
  });

  it("handles rate limiting", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("too many requests")).toBe(expected);
    expect(translateAuthError("rate limit exceeded")).toBe(expected);
  });

  it("handles user not found", () => {
    expect(translateAuthError("user not found")).toBe(
      "Akun tidak ditemukan. Pastikan email yang dimasukkan benar.",
    );
  });

  it("handles user already registered", () => {
    const expected =
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("user already registered")).toBe(expected);
    expect(translateAuthError("email already exists")).toBe(expected);
  });

  it("handles short passwords", () => {
    expect(translateAuthError("password should be at least 6 characters")).toBe(
      "Kata sandi terlalu pendek. Gunakan minimal 6 karakter.",
    );
  });

  it("handles weak passwords", () => {
    const expected =
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.";
    expect(translateAuthError("weak password")).toBe(expected);
    expect(translateAuthError("password strength is too low")).toBe(expected);
  });

  it("handles expired tokens", () => {
    const expected = "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("token expired")).toBe(expected);
    expect(translateAuthError("expired token")).toBe(expected);
  });

  it("handles invalid tokens", () => {
    expect(translateAuthError("invalid token")).toBe(
      "Tautan tidak valid atau sudah digunakan.",
    );
  });

  it("returns the original message if it does not match any known errors", () => {
    const msg = "Some mysterious database error occurred.";
    expect(translateAuthError(msg)).toBe(msg);
  });

  it("is case insensitive", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("INVALID LOGIN CREDENTIALS")).toBe(expected);
  });
});
