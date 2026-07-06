import { describe, expect,it } from 'vitest';

import { translateAuthError } from '../translateAuthError';

describe('translateAuthError', () => {
  it('returns default message for empty string', () => {
    expect(translateAuthError('')).toBe('Terjadi kesalahan yang tidak diketahui.');
  });

  it('returns connection error message', () => {
    expect(translateAuthError('failed to fetch')).toBe('Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.');
    expect(translateAuthError('NetworkError when attempting to fetch resource.')).toBe('Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.');
    expect(translateAuthError('Load failed')).toBe('Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.');
    expect(translateAuthError('CORS policy')).toBe('Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.');
    expect(translateAuthError('cross-origin')).toBe('Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.');
    expect(translateAuthError('mixed content')).toBe('Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.');
  });

  it('returns invalid credentials message', () => {
    expect(translateAuthError('Invalid login credentials')).toBe('Email atau kata sandi salah. Silakan coba lagi.');
    expect(translateAuthError('invalid_credentials')).toBe('Email atau kata sandi salah. Silakan coba lagi.');
  });

  it('returns email not confirmed message', () => {
    expect(translateAuthError('Email not confirmed')).toBe('Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.');
  });

  it('returns rate limit message', () => {
    expect(translateAuthError('too many requests')).toBe('Terlalu banyak percobaan. Silakan tunggu beberapa saat.');
    expect(translateAuthError('rate limit exceeded')).toBe('Terlalu banyak percobaan. Silakan tunggu beberapa saat.');
  });

  it('returns user not found message', () => {
    expect(translateAuthError('user not found')).toBe('Akun tidak ditemukan. Pastikan email yang dimasukkan benar.');
  });

  it('returns user already registered message', () => {
    expect(translateAuthError('User already registered')).toBe('Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.');
    expect(translateAuthError('email already exists')).toBe('Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.');
  });

  it('returns password too short message', () => {
    expect(translateAuthError('Password should be at least 6 characters')).toBe('Kata sandi terlalu pendek. Gunakan minimal 6 karakter.');
  });

  it('returns weak password message', () => {
    expect(translateAuthError('Weak password')).toBe('Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.');
    expect(translateAuthError('password strength is low')).toBe('Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.');
  });

  it('returns token expired message', () => {
    expect(translateAuthError('Token expired')).toBe('Tautan sudah kedaluwarsa. Silakan minta tautan baru.');
    expect(translateAuthError('expired token')).toBe('Tautan sudah kedaluwarsa. Silakan minta tautan baru.');
  });

  it('returns invalid token message', () => {
    expect(translateAuthError('Invalid token')).toBe('Tautan tidak valid atau sudah digunakan.');
  });

  it('returns raw message for unknown errors', () => {
    const unknownError = 'Some unknown database error';
    expect(translateAuthError(unknownError)).toBe(unknownError);
  });
});
