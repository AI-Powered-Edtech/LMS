import { describe, expect, it } from "vitest";

import { translateAuthError } from "@/utils/translateAuthError";

describe("translateAuthError", () => {
  it("returns unknown error for empty message", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("translates network errors", () => {
    expect(translateAuthError("failed to fetch")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("NetworkError when attempting to fetch resource.")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
  });

  it("translates invalid login credentials", () => {
    expect(translateAuthError("invalid login credentials")).toBe("Email atau kata sandi salah. Silakan coba lagi.");
  });

  it("translates unconfirmed email", () => {
    expect(translateAuthError("email not confirmed")).toBe("Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.");
  });

  it("translates rate limit", () => {
    expect(translateAuthError("too many requests")).toBe("Terlalu banyak percobaan. Silakan tunggu beberapa saat.");
  });

  it("translates user not found", () => {
    expect(translateAuthError("user not found")).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");
  });

  it("translates user already registered", () => {
    expect(translateAuthError("user already registered")).toBe("Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
  });

  it("translates short password", () => {
    expect(translateAuthError("password should be at least 6 characters")).toBe("Kata sandi terlalu pendek. Gunakan minimal 6 karakter.");
  });

  it("translates weak password", () => {
    expect(translateAuthError("weak password")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
  });

  it("translates expired token", () => {
    expect(translateAuthError("token expired")).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
  });

  it("translates invalid token", () => {
    expect(translateAuthError("invalid token")).toBe("Tautan tidak valid atau sudah digunakan.");
  });

  it("returns original message for unknown errors", () => {
    expect(translateAuthError("Some random unknown error")).toBe("Some random unknown error");
  });
});
