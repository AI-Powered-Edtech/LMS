import { describe, expect,it } from 'vitest';

import { translateAuthError } from '../translateAuthError';

describe('translateAuthError', () => {
  it('returns default error message for empty input', () => {
    expect(translateAuthError('')).toBe('Terjadi kesalahan yang tidak diketahui.');
    // @ts-expect-error testing invalid input type
    expect(translateAuthError(null)).toBe('Terjadi kesalahan yang tidak diketahui.');
    // @ts-expect-error testing invalid input type
    expect(translateAuthError(undefined)).toBe('Terjadi kesalahan yang tidak diketahui.');
  });

  it('translates network errors', () => {
    const expected = 'Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.';
    expect(translateAuthError('failed to fetch')).toBe(expected);
    expect(translateAuthError('NetworkError when attempting to fetch resource')).toBe(expected);
    expect(translateAuthError('Load failed')).toBe(expected);
    expect(translateAuthError('CORS error')).toBe(expected);
    expect(translateAuthError('cross-origin request blocked')).toBe(expected);
    expect(translateAuthError('mixed content')).toBe(expected);
  });

  it('translates invalid credentials', () => {
    const expected = 'Email atau kata sandi salah. Silakan coba lagi.';
    expect(translateAuthError('Invalid login credentials')).toBe(expected);
    expect(translateAuthError('invalid_credentials')).toBe(expected);
  });

  it('translates unconfirmed email', () => {
    expect(translateAuthError('Email not confirmed')).toBe('Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.');
  });

  it('translates rate limiting errors', () => {
    const expected = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.';
    expect(translateAuthError('Too many requests')).toBe(expected);
    expect(translateAuthError('Rate limit exceeded')).toBe(expected);
  });

  it('translates user not found error', () => {
    expect(translateAuthError('user not found')).toBe('Akun tidak ditemukan. Pastikan email yang dimasukkan benar.');
  });

  it('translates user already registered error', () => {
    const expected = 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.';
    expect(translateAuthError('User already registered')).toBe(expected);
    expect(translateAuthError('Email already exists')).toBe(expected);
  });

  it('translates password length error', () => {
    expect(translateAuthError('Password should be at least 6 characters')).toBe('Kata sandi terlalu pendek. Gunakan minimal 6 karakter.');
  });

  it('translates weak password error', () => {
    const expected = 'Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.';
    expect(translateAuthError('Weak password')).toBe(expected);
    expect(translateAuthError('Password strength is insufficient')).toBe(expected);
  });

  it('translates expired token error', () => {
    const expected = 'Tautan sudah kedaluwarsa. Silakan minta tautan baru.';
    expect(translateAuthError('Token expired')).toBe(expected);
    expect(translateAuthError('Expired token')).toBe(expected);
  });

  it('translates invalid token error', () => {
    expect(translateAuthError('Invalid token')).toBe('Tautan tidak valid atau sudah digunakan.');
  });

  it('returns the raw message if it does not match any known error', () => {
    expect(translateAuthError('Unknown server error 500')).toBe('Unknown server error 500');
  });
});
