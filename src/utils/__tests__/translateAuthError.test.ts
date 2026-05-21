import { describe, expect, it } from "vitest";

import { translateAuthError } from "@/utils/translateAuthError";

describe("translateAuthError", () => {
  it("returns default error message for empty or falsy input", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid runtime input
    expect(translateAuthError(null)).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid runtime input
    expect(translateAuthError(undefined)).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("translates network errors", () => {
    const expected = "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("failed to fetch")).toBe(expected);
    expect(translateAuthError("networkerror")).toBe(expected);
    expect(translateAuthError("load failed")).toBe(expected);
    expect(translateAuthError("cors")).toBe(expected);
    expect(translateAuthError("cross-origin")).toBe(expected);
    expect(translateAuthError("mixed content")).toBe(expected);
  });

  it("translates invalid credentials errors", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("invalid login credentials")).toBe(expected);
    expect(translateAuthError("invalid_credentials")).toBe(expected);
  });

  it("translates email not confirmed errors", () => {
    expect(translateAuthError("email not confirmed")).toBe("Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.");
  });

  it("translates rate limit errors", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("too many requests")).toBe(expected);
    expect(translateAuthError("rate limit")).toBe(expected);
  });

  it("translates user not found errors", () => {
    expect(translateAuthError("user not found")).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");
  });

  it("translates user already registered errors", () => {
    const expected = "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("user already registered")).toBe(expected);
    expect(translateAuthError("already exists")).toBe(expected);
  });

  it("translates password length errors", () => {
    expect(translateAuthError("password should be at least")).toBe("Kata sandi terlalu pendek. Gunakan minimal 6 karakter.");
  });

  it("translates weak password errors", () => {
    const expected = "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.";
    expect(translateAuthError("weak password")).toBe(expected);
    expect(translateAuthError("password strength")).toBe(expected);
  });

  it("translates expired token errors", () => {
    const expected = "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("token expired")).toBe(expected);
    expect(translateAuthError("expired token")).toBe(expected);
  });

  it("translates invalid token errors", () => {
    expect(translateAuthError("invalid token")).toBe("Tautan tidak valid atau sudah digunakan.");
  });

  it("returns the original message if it does not match any known patterns", () => {
    const unknownError = "Some random unknown error from the server";
    expect(translateAuthError(unknownError)).toBe(unknownError);
  });
});
