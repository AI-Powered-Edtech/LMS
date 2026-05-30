import { describe, expect, it } from "vitest";

import { translateAuthError } from "@/utils/translateAuthError";

describe("translateAuthError", () => {
  it("returns a generic message for empty input", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
    expect(translateAuthError(null as unknown as string)).toBe("Terjadi kesalahan yang tidak diketahui.");
    expect(translateAuthError(undefined as unknown as string)).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("translates network errors", () => {
    const expected = "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("Failed to fetch data")).toBe(expected);
    expect(translateAuthError("NetworkError when attempting to fetch resource.")).toBe(expected);
    expect(translateAuthError("load failed")).toBe(expected);
    expect(translateAuthError("CORS error")).toBe(expected);
    expect(translateAuthError("Cross-Origin Request Blocked")).toBe(expected);
    expect(translateAuthError("Mixed Content")).toBe(expected);
  });

  it("translates invalid credentials", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("Invalid login credentials")).toBe(expected);
    expect(translateAuthError("invalid_credentials")).toBe(expected);
  });

  it("translates email not confirmed", () => {
    expect(translateAuthError("Email not confirmed")).toBe("Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.");
  });

  it("translates rate limit errors", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("too many requests")).toBe(expected);
    expect(translateAuthError("rate limit exceeded")).toBe(expected);
  });

  it("translates user not found", () => {
    expect(translateAuthError("user not found")).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");
  });

  it("translates user already registered", () => {
    const expected = "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("user already registered")).toBe(expected);
    expect(translateAuthError("user already exists")).toBe(expected);
  });

  it("translates short password", () => {
    expect(translateAuthError("password should be at least 6 characters")).toBe("Kata sandi terlalu pendek. Gunakan minimal 6 karakter.");
  });

  it("translates weak password", () => {
    const expected = "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.";
    expect(translateAuthError("weak password")).toBe(expected);
    expect(translateAuthError("password strength is too low")).toBe(expected);
  });

  it("translates expired token", () => {
    const expected = "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("token expired")).toBe(expected);
    expect(translateAuthError("expired token")).toBe(expected);
  });

  it("translates invalid token", () => {
    expect(translateAuthError("invalid token")).toBe("Tautan tidak valid atau sudah digunakan.");
  });

  it("returns the original message if not matched", () => {
    expect(translateAuthError("Some random unknown error")).toBe("Some random unknown error");
  });
});
