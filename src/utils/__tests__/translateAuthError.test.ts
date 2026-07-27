import { describe, expect, it } from "vitest";
import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("handles empty or null messages", () => {
    expect(translateAuthError("")).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
  });

  it("translates network errors", () => {
    expect(translateAuthError("Failed to fetch data")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.",
    );
    expect(translateAuthError("NetworkError when attempting to fetch")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.",
    );
    expect(translateAuthError("CORS policy error")).toBe(
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.",
    );
  });

  it("translates invalid login credentials", () => {
    expect(translateAuthError("Invalid login credentials")).toBe(
      "Email atau kata sandi salah. Silakan coba lagi.",
    );
    expect(translateAuthError("invalid_credentials")).toBe(
      "Email atau kata sandi salah. Silakan coba lagi.",
    );
  });

  it("translates unconfirmed email", () => {
    expect(translateAuthError("Email not confirmed")).toBe(
      "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.",
    );
  });

  it("translates rate limits", () => {
    expect(translateAuthError("Too many requests")).toBe(
      "Terlalu banyak percobaan. Silakan tunggu beberapa saat.",
    );
    expect(translateAuthError("rate limit exceeded")).toBe(
      "Terlalu banyak percobaan. Silakan tunggu beberapa saat.",
    );
  });

  it("translates user not found", () => {
    expect(translateAuthError("user not found")).toBe(
      "Akun tidak ditemukan. Pastikan email yang dimasukkan benar.",
    );
  });

  it("translates user already registered", () => {
    expect(translateAuthError("user already registered")).toBe(
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.",
    );
    expect(translateAuthError("User already exists")).toBe(
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.",
    );
  });

  it("translates short password", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe(
      "Kata sandi terlalu pendek. Gunakan minimal 6 karakter.",
    );
  });

  it("translates weak password", () => {
    expect(translateAuthError("weak password")).toBe(
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.",
    );
    expect(translateAuthError("password strength")).toBe(
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.",
    );
  });

  it("translates expired token", () => {
    expect(translateAuthError("token expired")).toBe(
      "Tautan sudah kedaluwarsa. Silakan minta tautan baru.",
    );
    expect(translateAuthError("expired token")).toBe(
      "Tautan sudah kedaluwarsa. Silakan minta tautan baru.",
    );
  });

  it("translates invalid token", () => {
    expect(translateAuthError("invalid token")).toBe(
      "Tautan tidak valid atau sudah digunakan.",
    );
  });

  it("returns the original message if no match is found", () => {
    expect(translateAuthError("Some random error")).toBe("Some random error");
  });
});
