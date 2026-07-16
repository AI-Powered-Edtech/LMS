import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("returns fallback message for empty input", () => {
    expect(translateAuthError("")).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    // @ts-expect-error Testing invalid input
    expect(translateAuthError(null)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    // @ts-expect-error Testing invalid input
    expect(translateAuthError(undefined)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
  });

  it("translates network errors", () => {
    const expected =
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("Failed to fetch")).toBe(expected);
    expect(translateAuthError("NetworkError")).toBe(expected);
    expect(translateAuthError("Load failed")).toBe(expected);
    expect(translateAuthError("CORS")).toBe(expected);
    expect(translateAuthError("Cross-Origin")).toBe(expected);
    expect(translateAuthError("Mixed Content")).toBe(expected);
  });

  it("translates invalid credentials", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("Invalid login credentials")).toBe(expected);
    expect(translateAuthError("invalid_credentials")).toBe(expected);
  });

  it("translates email not confirmed", () => {
    expect(translateAuthError("Email not confirmed")).toBe(
      "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.",
    );
  });

  it("translates rate limits", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("Too many requests")).toBe(expected);
    expect(translateAuthError("Rate limit exceeded")).toBe(expected);
  });

  it("translates user not found", () => {
    expect(translateAuthError("User not found")).toBe(
      "Akun tidak ditemukan. Pastikan email yang dimasukkan benar.",
    );
  });

  it("translates already registered", () => {
    const expected =
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("User already registered")).toBe(expected);
    expect(translateAuthError("User already exists")).toBe(expected);
  });

  it("translates password too short", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe(
      "Kata sandi terlalu pendek. Gunakan minimal 6 karakter.",
    );
  });

  it("translates weak password", () => {
    const expected =
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.";
    expect(translateAuthError("Weak password")).toBe(expected);
    expect(translateAuthError("Password strength is weak")).toBe(expected);
  });

  it("translates token expired", () => {
    const expected = "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("Token expired")).toBe(expected);
    expect(translateAuthError("Expired token")).toBe(expected);
  });

  it("translates invalid token", () => {
    expect(translateAuthError("Invalid token")).toBe(
      "Tautan tidak valid atau sudah digunakan.",
    );
  });

  it("returns raw message if unknown", () => {
    expect(translateAuthError("Some random unknown error")).toBe(
      "Some random unknown error",
    );
  });
});
