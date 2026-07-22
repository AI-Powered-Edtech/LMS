import { describe, expect,it } from "vitest";

import { translateAuthError } from "../translateAuthError";

describe("translateAuthError", () => {
  it("returns generic error if message is empty", () => {
    expect(translateAuthError("")).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    // @ts-expect-error testing invalid inputs
    expect(translateAuthError(null)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
    // @ts-expect-error testing invalid inputs
    expect(translateAuthError(undefined)).toBe(
      "Terjadi kesalahan yang tidak diketahui.",
    );
  });

  it("handles network and fetch errors", () => {
    const expected =
      "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError("failed to fetch data")).toBe(expected);
    expect(translateAuthError("networkerror occurred")).toBe(expected);
    expect(translateAuthError("load failed")).toBe(expected);
    expect(translateAuthError("cors issue")).toBe(expected);
    expect(translateAuthError("cross-origin request blocked")).toBe(expected);
    expect(translateAuthError("mixed content")).toBe(expected);
  });

  it("handles invalid credentials", () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError("Invalid login credentials")).toBe(expected);
    expect(translateAuthError("invalid_credentials error")).toBe(expected);
  });

  it("handles email not confirmed", () => {
    expect(translateAuthError("email not confirmed")).toBe(
      "Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.",
    );
  });

  it("handles rate limiting", () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError("Too many requests")).toBe(expected);
    expect(translateAuthError("rate limit exceeded")).toBe(expected);
  });

  it("handles user not found", () => {
    expect(translateAuthError("User not found in system")).toBe(
      "Akun tidak ditemukan. Pastikan email yang dimasukkan benar.",
    );
  });

  it("handles already registered", () => {
    const expected =
      "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError("user already registered")).toBe(expected);
    expect(translateAuthError("email already exists")).toBe(expected);
  });

  it("handles password issues", () => {
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

  it("handles token issues", () => {
    expect(translateAuthError("token expired please re-login")).toBe(
      "Tautan sudah kedaluwarsa. Silakan minta tautan baru.",
    );
    expect(translateAuthError("expired token error")).toBe(
      "Tautan sudah kedaluwarsa. Silakan minta tautan baru.",
    );
    expect(translateAuthError("invalid token format")).toBe(
      "Tautan tidak valid atau sudah digunakan.",
    );
  });

  it("returns original message if no match is found", () => {
    expect(translateAuthError("Some random error")).toBe("Some random error");
  });
});
