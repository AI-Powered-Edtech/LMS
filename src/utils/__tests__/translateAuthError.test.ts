import { describe, expect, it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("should handle empty, null, or undefined inputs", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe("Terjadi kesalahan yang tidak diketahui.");
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("should translate network errors", () => {
    const networkMsg = "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("Failed to fetch")).toBe(networkMsg);
    expect(translateAuthError("NetworkError when attempting to fetch resource.")).toBe(networkMsg);
    expect(translateAuthError("Load failed")).toBe(networkMsg);
    expect(translateAuthError("CORS policy error")).toBe(networkMsg);
    expect(translateAuthError("Cross-Origin Request Blocked")).toBe(networkMsg);
    expect(translateAuthError("Mixed Content error")).toBe(networkMsg);
  });

  it("should translate invalid credentials errors", () => {
    const invalidMsg = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("Invalid login credentials")).toBe(invalidMsg);
    expect(translateAuthError("invalid_credentials")).toBe(invalidMsg);
  });

  it("should translate unconfirmed email error", () => {
    expect(translateAuthError("Email not confirmed")).toBe("Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.");
  });

  it("should translate rate limit errors", () => {
    const rateLimitMsg = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("Too many requests")).toBe(rateLimitMsg);
    expect(translateAuthError("Rate limit exceeded")).toBe(rateLimitMsg);
  });

  it("should translate user not found error", () => {
    expect(translateAuthError("User not found")).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");
  });

  it("should translate user already exists errors", () => {
    const existsMsg = "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("User already registered")).toBe(existsMsg);
    expect(translateAuthError("Already exists")).toBe(existsMsg);
  });

  it("should translate password errors", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe("Kata sandi terlalu pendek. Gunakan minimal 6 karakter.");
    expect(translateAuthError("Weak password")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
    expect(translateAuthError("Password strength is too low")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
  });

  it("should translate token errors", () => {
    const expiredMsg = "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("Token expired")).toBe(expiredMsg);
    expect(translateAuthError("Expired token")).toBe(expiredMsg);

    expect(translateAuthError("Invalid token")).toBe("Tautan tidak valid atau sudah digunakan.");
  });

  it("should return the original message if unknown", () => {
    expect(translateAuthError("Some random unknown error")).toBe("Some random unknown error");
  });

  it("should be case insensitive", () => {
    expect(translateAuthError("FAILED TO FETCH")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("uSeR nOt fOuNd")).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");
  });
});
