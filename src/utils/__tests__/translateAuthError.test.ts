import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("returns default message for empty input", () => {
    expect(translateAuthError("")).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
  });

  it("handles network errors", () => {
    expect(translateAuthError("failed to fetch")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.",
    );
    expect(translateAuthError("NetworkError")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.",
    );
  });

  it("handles invalid credentials", () => {
    expect(translateAuthError("invalid login credentials")).toBe(
      "Email atau kata sandi salah. Silakan coba lagi.",
    );
    expect(translateAuthError("invalid_credentials")).toBe(
      "Email atau kata sandi salah. Silakan coba lagi.",
    );
  });

  it("handles unconfirmed email", () => {
    expect(translateAuthError("email not confirmed")).toBe(
      "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.",
    );
  });

  it("handles rate limits", () => {
    expect(translateAuthError("too many requests")).toBe(
      "Terlalu banyak percobaan. Silakan tunggu beberapa saat.",
    );
  });

  it("handles user not found", () => {
    expect(translateAuthError("user not found")).toBe(
      "Akun tidak ditemukan. Pastikan email yang dimasukkan benar.",
    );
  });

  it("handles user already registered", () => {
    expect(translateAuthError("user already registered")).toBe(
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.",
    );
  });

  it("handles password too short", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe(
      "Kata sandi terlalu pendek. Gunakan minimal 6 karakter.",
    );
  });

  it("handles weak password", () => {
    expect(translateAuthError("Weak password")).toBe(
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.",
    );
  });

  it("handles expired token", () => {
    expect(translateAuthError("Token expired")).toBe(
      "Tautan sudah kedaluwarsa. Silakan minta tautan baru.",
    );
  });

  it("handles invalid token", () => {
    expect(translateAuthError("Invalid token")).toBe(
      "Tautan tidak valid atau sudah digunakan.",
    );
  });

  it("returns the original message if unknown", () => {
    expect(translateAuthError("Unknown error occurred")).toBe(
      "Unknown error occurred",
    );
  });
});
