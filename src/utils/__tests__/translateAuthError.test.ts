import { describe, expect,it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should return a generic message for falsy input", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error - testing invalid input
    expect(translateAuthError(null)).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error - testing invalid input
    expect(translateAuthError(undefined)).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("should translate network errors", () => {
    const expected = "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("Failed to fetch")).toBe(expected);
    expect(translateAuthError("NetworkError")).toBe(expected);
    expect(translateAuthError("Load failed")).toBe(expected);
    expect(translateAuthError("CORS error")).toBe(expected);
    expect(translateAuthError("Cross-origin request blocked")).toBe(expected);
    expect(translateAuthError("Mixed content blocked")).toBe(expected);
  });

  it("should translate invalid credentials errors", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("invalid login credentials")).toBe(expected);
    expect(translateAuthError("invalid_credentials")).toBe(expected);
  });

  it("should translate unconfirmed email errors", () => {
    expect(translateAuthError("email not confirmed")).toBe("Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.");
  });

  it("should translate user not found errors", () => {
    expect(translateAuthError("user not found")).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");
  });

  it("should translate user already registered errors", () => {
    const expected = "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("user already registered")).toBe(expected);
    expect(translateAuthError("already exists")).toBe(expected);
  });

  it("should translate weak password length errors", () => {
    expect(translateAuthError("password should be at least 6 characters")).toBe("Kata sandi terlalu pendek. Gunakan minimal 6 karakter.");
  });

  it("should translate weak password errors", () => {
    const expected = "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.";
    expect(translateAuthError("weak password")).toBe(expected);
    expect(translateAuthError("password strength is poor")).toBe(expected);
  });

  it("should translate expired token errors", () => {
    const expected = "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("token expired")).toBe(expected);
    expect(translateAuthError("expired token")).toBe(expected);
  });

  it("should translate invalid token errors", () => {
    expect(translateAuthError("invalid token")).toBe("Tautan tidak valid atau sudah digunakan.");
  });

  it("should fallback to raw message if unknown", () => {
    expect(translateAuthError("Some unknown error occurred")).toBe("Some unknown error occurred");
  });
});
