import { describe, expect, it } from "vitest";
import { translateAuthError } from "@/utils/translateAuthError";

describe("translateAuthError", () => {
  it("handles empty or falsy messages", () => {
    expect(translateAuthError("")).toBe("Terjadi kesalahan yang tidak diketahui.");
    expect(translateAuthError(null as unknown as string)).toBe("Terjadi kesalahan yang tidak diketahui.");
    expect(translateAuthError(undefined as unknown as string)).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it("translates network errors", () => {
    expect(translateAuthError("failed to fetch")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("NetworkError when attempting to fetch resource.")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("CORS error")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("load failed")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("cross-origin request blocked")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
    expect(translateAuthError("blocked by mixed content")).toBe("Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.");
  });

  it("translates invalid credentials", () => {
    expect(translateAuthError("Invalid login credentials")).toBe("Email atau kata sandi salah. Silakan coba lagi.");
    expect(translateAuthError("invalid_credentials")).toBe("Email atau kata sandi salah. Silakan coba lagi.");
  });

  it("translates email not confirmed", () => {
    expect(translateAuthError("Email not confirmed")).toBe("Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.");
  });

  it("translates rate limit / too many requests", () => {
    expect(translateAuthError("Too many requests")).toBe("Terlalu banyak percobaan. Silakan tunggu beberapa saat.");
    expect(translateAuthError("Rate limit exceeded")).toBe("Terlalu banyak percobaan. Silakan tunggu beberapa saat.");
  });

  it("translates user not found", () => {
    expect(translateAuthError("User not found")).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");
  });

  it("translates user already registered", () => {
    expect(translateAuthError("User already registered")).toBe("Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
    expect(translateAuthError("User already exists")).toBe("Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.");
  });

  it("translates password too short", () => {
    expect(translateAuthError("Password should be at least 6 characters")).toBe("Kata sandi terlalu pendek. Gunakan minimal 6 karakter.");
  });

  it("translates weak password", () => {
    expect(translateAuthError("Weak password")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
    expect(translateAuthError("Password strength is weak")).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
  });

  it("translates expired token", () => {
    expect(translateAuthError("Token expired")).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
    expect(translateAuthError("Expired token")).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
  });

  it("translates invalid token", () => {
    expect(translateAuthError("Invalid token")).toBe("Tautan tidak valid atau sudah digunakan.");
  });

  it("returns raw message for unknown errors", () => {
    expect(translateAuthError("Some random obscure error from supabase")).toBe("Some random obscure error from supabase");
  });
});
