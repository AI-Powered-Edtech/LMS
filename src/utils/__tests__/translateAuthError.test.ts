import { describe, expect,it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("handles empty, null, or undefined messages", () => {
    expect(translateAuthError("")).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    expect(translateAuthError(null as unknown as string)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    expect(translateAuthError(undefined as unknown as string)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
  });

  it("translates network errors", () => {
    const expected =
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("failed to fetch data")).toBe(expected);
    expect(translateAuthError("NetworkError occurred")).toBe(expected);
    expect(translateAuthError("load failed in browser")).toBe(expected);
    expect(translateAuthError("blocked by CORS policy")).toBe(expected);
    expect(translateAuthError("cross-origin request blocked")).toBe(expected);
    expect(translateAuthError("mixed content error")).toBe(expected);
  });

  it("translates invalid credentials", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("Invalid login credentials provided")).toBe(
      expected,
    );
    expect(translateAuthError("error: invalid_credentials")).toBe(expected);
  });

  it("translates unconfirmed email", () => {
    expect(translateAuthError("Email not confirmed")).toBe(
      "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.",
    );
  });

  it("translates rate limit errors", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("Too many requests")).toBe(expected);
    expect(translateAuthError("rate limit exceeded")).toBe(expected);
  });

  it("translates user not found", () => {
    expect(translateAuthError("user not found in system")).toBe(
      "Akun tidak ditemukan. Pastikan email yang dimasukkan benar.",
    );
  });

  it("translates user already registered", () => {
    const expected =
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("user already registered")).toBe(expected);
    expect(translateAuthError("user already exists")).toBe(expected);
  });

  it("translates weak passwords", () => {
    expect(translateAuthError("password should be at least 6 characters")).toBe(
      "Kata sandi terlalu pendek. Gunakan minimal 6 karakter.",
    );
    expect(translateAuthError("weak password provided")).toBe(
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.",
    );
    expect(translateAuthError("password strength is low")).toBe(
      "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.",
    );
  });

  it("translates token errors", () => {
    const expiredExpected =
      "Tautan sudah kedaluwarsa. Silakan minta tautan baru.";
    expect(translateAuthError("Token expired")).toBe(expiredExpected);
    expect(translateAuthError("expired token")).toBe(expiredExpected);
    expect(translateAuthError("invalid token")).toBe(
      "Tautan tidak valid atau sudah digunakan.",
    );
  });

  it("returns raw message for unknown errors", () => {
    expect(translateAuthError("Some weird error")).toBe("Some weird error");
  });
});
