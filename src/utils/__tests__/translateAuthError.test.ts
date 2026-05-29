import { describe, expect,it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("returns default message for empty or falsy input", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("translates network errors", () => {
    expect(translateAuthError("Failed to fetch data")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("NetworkError when attempting to fetch resource.")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("load failed")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("CORS policy error")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("Cross-Origin Request Blocked")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("Mixed Content error")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
  });

  it("translates invalid credentials errors", () => {
    expect(translateAuthError("Invalid login credentials")).toBe("Email atau kata sandi salah. Silakan coba lagi.");
    expect(translateAuthError("invalid_credentials")).toBe("Email atau kata sandi salah. Silakan coba lagi.");
  });

  it("translates unconfirmed email errors", () => {
    expect(translateAuthError("Email not confirmed")).toBe("Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.");
  });

  it("translates rate limit errors", () => {
    expect(translateAuthError("Too many requests")).toBe("Terlalu banyak percobaan. Silakan tunggu beberapa saat.");
    expect(translateAuthError("Rate limit exceeded")).toBe("Terlalu banyak percobaan. Silakan tunggu beberapa saat.");
  });

  it("translates user not found errors", () => {
    expect(translateAuthError("User not found")).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");
  });

  it("translates user already registered errors", () => {
    expect(translateAuthError("User already registered")).toBe("Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
    expect(translateAuthError("User already exists")).toBe("Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
  });

  it("translates weak password errors", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe("Kata sandi terlalu pendek. Gunakan minimal 6 karakter.");
    expect(translateAuthError("Weak password")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
    expect(translateAuthError("Password strength is too low")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
  });

  it("translates token errors", () => {
    expect(translateAuthError("Token expired")).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
    expect(translateAuthError("Expired token")).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
    expect(translateAuthError("Invalid token")).toBe("Tautan tidak valid atau sudah digunakan.");
  });

  it("returns the raw message if it does not match any known error", () => {
    expect(translateAuthError("Some unknown server error occurred")).toBe("Some unknown server error occurred");
  });
});
