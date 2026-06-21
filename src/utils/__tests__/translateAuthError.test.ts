import { describe, expect, it } from "vitest";

import { translateAuthError } from "@/utils/translateAuthError";

describe("translateAuthError", () => {
  it("returns unknown error for empty string", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("translates network errors", () => {
    const expected = "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("failed to fetch")).toBe(expected);
    expect(translateAuthError("NetworkError")).toBe(expected);
    expect(translateAuthError("load failed")).toBe(expected);
    expect(translateAuthError("cors")).toBe(expected);
    expect(translateAuthError("Cross-Origin")).toBe(expected);
    expect(translateAuthError("mixed content")).toBe(expected);
  });

  it("translates invalid login credentials", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("Invalid login credentials")).toBe(expected);
    expect(translateAuthError("invalid_credentials")).toBe(expected);
  });

  it("translates unconfirmed email", () => {
    const expected = "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.";
    expect(translateAuthError("email not confirmed")).toBe(expected);
  });

  it("translates rate limit", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("Too many requests")).toBe(expected);
    expect(translateAuthError("rate limit exceeded")).toBe(expected);
  });

  it("translates user not found", () => {
    const expected = "Akun tidak ditemukan. Pastikan email yang dimasukkan benar.";
    expect(translateAuthError("User not found")).toBe(expected);
  });

  it("translates already registered", () => {
    const expected = "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("User already registered")).toBe(expected);
    expect(translateAuthError("email already exists")).toBe(expected);
  });

  it("translates password too short", () => {
    const expected = "Kata sandi terlalu pendek. Gunakan minimal 6 karakter.";
    expect(translateAuthError("Password should be at least 6 characters")).toBe(expected);
  });

  it("translates weak password", () => {
    const expected = "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.";
    expect(translateAuthError("weak password")).toBe(expected);
    expect(translateAuthError("password strength is low")).toBe(expected);
  });

  it("translates expired token", () => {
    const expected = "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("token expired")).toBe(expected);
    expect(translateAuthError("expired token")).toBe(expected);
  });

  it("translates invalid token", () => {
    const expected = "Tautan tidak valid atau sudah digunakan.";
    expect(translateAuthError("invalid token")).toBe(expected);
  });

  it("returns fallback message for unknown errors", () => {
    const unknownError = "Some random error occurred";
    expect(translateAuthError(unknownError)).toBe(unknownError);
  });
});
