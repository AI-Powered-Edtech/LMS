import { describe, expect,it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("handles empty or missing messages", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("translates network errors", () => {
    const expectedMessage = "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("Failed to fetch")).toBe(expectedMessage);
    expect(translateAuthError("NetworkError")).toBe(expectedMessage);
    expect(translateAuthError("Load failed")).toBe(expectedMessage);
    expect(translateAuthError("CORS error")).toBe(expectedMessage);
    expect(translateAuthError("cross-origin request blocked")).toBe(expectedMessage);
    expect(translateAuthError("mixed content")).toBe(expectedMessage);
  });

  it("translates invalid credentials", () => {
    const expectedMessage = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("Invalid login credentials")).toBe(expectedMessage);
    expect(translateAuthError("invalid_credentials")).toBe(expectedMessage);
  });

  it("translates unconfirmed email", () => {
    expect(translateAuthError("Email not confirmed")).toBe("Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.");
  });

  it("translates rate limit / too many requests", () => {
    const expectedMessage = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("Too many requests")).toBe(expectedMessage);
    expect(translateAuthError("Rate limit exceeded")).toBe(expectedMessage);
  });

  it("translates user not found", () => {
    expect(translateAuthError("User not found in system")).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");
  });

  it("translates user already registered", () => {
    const expectedMessage = "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("User already registered")).toBe(expectedMessage);
    expect(translateAuthError("User already exists")).toBe(expectedMessage);
  });

  it("translates short password", () => {
    expect(translateAuthError("Password should be at least 8 characters")).toBe("Kata sandi terlalu pendek. Gunakan minimal 6 karakter.");
  });

  it("translates weak password", () => {
    const expectedMessage = "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.";
    expect(translateAuthError("Weak password")).toBe(expectedMessage);
    expect(translateAuthError("Password strength is too low")).toBe(expectedMessage);
  });

  it("translates expired token", () => {
    const expectedMessage = "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("Token expired")).toBe(expectedMessage);
    expect(translateAuthError("Expired token")).toBe(expectedMessage);
  });

  it("translates invalid token", () => {
    expect(translateAuthError("Invalid token provided")).toBe("Tautan tidak valid atau sudah digunakan.");
  });

  it("returns original message if unknown error", () => {
    const unknownError = "Some bizarre backend error occurred 500";
    expect(translateAuthError(unknownError)).toBe(unknownError);
  });
});
