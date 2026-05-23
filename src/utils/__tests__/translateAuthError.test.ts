import { describe, expect,it } from 'vitest';

import { translateAuthError } from '../translateAuthError';

describe('translateAuthError', () => {
  it('handles empty message', () => {
    // @ts-expect-error - testing invalid input
    expect(translateAuthError(null)).toBe('Terjadi kesalahan yang tidak diketahui.');
    expect(translateAuthError('')).toBe('Terjadi kesalahan yang tidak diketahui.');
  });

  it('handles network errors', () => {
    const expected = 'Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.';
    expect(translateAuthError('Failed to fetch')).toBe(expected);
    expect(translateAuthError('NetworkError when attempting to fetch resource')).toBe(expected);
    expect(translateAuthError('Load failed')).toBe(expected);
    expect(translateAuthError('CORS policy')).toBe(expected);
    expect(translateAuthError('cross-origin request')).toBe(expected);
    expect(translateAuthError('mixed content')).toBe(expected);
  });

  it('handles invalid credentials', () => {
    const expected = 'Email atau kata sandi salah. Silakan coba lagi.';
    expect(translateAuthError('invalid login credentials')).toBe(expected);
    expect(translateAuthError('invalid_credentials')).toBe(expected);
  });

  it('handles email not confirmed', () => {
    expect(translateAuthError('email not confirmed')).toBe('Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.');
  });

  it('handles rate limits', () => {
    const expected = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.';
    expect(translateAuthError('too many requests')).toBe(expected);
    expect(translateAuthError('rate limit exceeded')).toBe(expected);
  });

  it('handles user not found', () => {
    expect(translateAuthError('user not found')).toBe('Akun tidak ditemukan. Pastikan email yang dimasukkan benar.');
  });

  it('handles user already exists', () => {
    const expected = 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.';
    expect(translateAuthError('user already registered')).toBe(expected);
    expect(translateAuthError('already exists')).toBe(expected);
  });

  it('handles password too short', () => {
    expect(translateAuthError('password should be at least 6 characters')).toBe('Kata sandi terlalu pendek. Gunakan minimal 6 karakter.');
  });

  it('handles weak password', () => {
    const expected = 'Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.';
    expect(translateAuthError('weak password')).toBe(expected);
    expect(translateAuthError('password strength')).toBe(expected);
  });

  it('handles expired token', () => {
    const expected = 'Tautan sudah kedaluwarsa. Silakan minta tautan baru.';
    expect(translateAuthError('token expired')).toBe(expected);
    expect(translateAuthError('expired token')).toBe(expected);
  });

  it('handles invalid token', () => {
    expect(translateAuthError('invalid token')).toBe('Tautan tidak valid atau sudah digunakan.');
  });

  it('returns raw message for unknown errors', () => {
    const unknownError = 'Something bad happened';
    expect(translateAuthError(unknownError)).toBe(unknownError);
  });
});
