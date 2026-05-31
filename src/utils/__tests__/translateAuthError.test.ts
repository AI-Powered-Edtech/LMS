import { describe, expect,it } from 'vitest';

import { translateAuthError } from '../translateAuthError';

describe('translateAuthError', () => {
  it('handles empty message', () => {
    expect(translateAuthError('')).toBe("Terjadi kesalahan yang tidak diketahui.");
  });

  it('translates network errors', () => {
    const expected = "Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.";
    expect(translateAuthError('failed to fetch')).toBe(expected);
    expect(translateAuthError('NetworkError')).toBe(expected);
    expect(translateAuthError('Load failed')).toBe(expected);
    expect(translateAuthError('CORS error')).toBe(expected);
    expect(translateAuthError('Cross-Origin Request Blocked')).toBe(expected);
    expect(translateAuthError('Mixed Content blocked')).toBe(expected);
  });

  it('translates invalid login credentials', () => {
    const expected = "Email atau kata sandi salah. Silakan coba lagi.";
    expect(translateAuthError('Invalid login credentials')).toBe(expected);
    expect(translateAuthError('invalid_credentials')).toBe(expected);
  });

  it('translates email not confirmed', () => {
    expect(translateAuthError('Email not confirmed')).toBe("Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.");
  });

  it('translates rate limit errors', () => {
    const expected = "Terlalu banyak percobaan. Silakan tunggu beberapa saat.";
    expect(translateAuthError('Too many requests')).toBe(expected);
    expect(translateAuthError('rate limit exceeded')).toBe(expected);
  });

  it('translates user not found', () => {
    expect(translateAuthError('User not found')).toBe("Akun tidak ditemukan. Pastikan email yang dimasukkan benar.");
  });

  it('translates user already exists', () => {
    const expected = "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.";
    expect(translateAuthError('User already registered')).toBe(expected);
    expect(translateAuthError('User already exists')).toBe(expected);
  });

  it('translates weak password errors', () => {
    expect(translateAuthError('Password should be at least 6 characters')).toBe("Kata sandi terlalu pendek. Gunakan minimal 6 karakter.");
    expect(translateAuthError('Weak password')).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
    expect(translateAuthError('Password strength is low')).toBe("Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.");
  });

  it('translates token errors', () => {
    expect(translateAuthError('Token expired')).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
    expect(translateAuthError('Expired token')).toBe("Tautan sudah kedaluwarsa. Silakan minta tautan baru.");
    expect(translateAuthError('Invalid token')).toBe("Tautan tidak valid atau sudah digunakan.");
  });

  it('returns original message if unknown', () => {
    expect(translateAuthError('Some random error')).toBe('Some random error');
  });
});
