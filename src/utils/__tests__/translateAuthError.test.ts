import { describe, expect,it } from 'vitest';

import { translateAuthError } from '../translateAuthError';

describe('translateAuthError', () => {
  it('returns default error message for falsy inputs', () => {
    expect(translateAuthError('')).toBe('Terjadi kesalahan yang tidak diketahui.');
    expect(translateAuthError(null as any)).toBe('Terjadi kesalahan yang tidak diketahui.');
    expect(translateAuthError(undefined as any)).toBe('Terjadi kesalahan yang tidak diketahui.');
  });

  it('translates network errors', () => {
    const expected = 'Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.';
    expect(translateAuthError('failed to fetch data')).toBe(expected);
    expect(translateAuthError('NetworkError occurred')).toBe(expected);
    expect(translateAuthError('load failed')).toBe(expected);
    expect(translateAuthError('cors error')).toBe(expected);
    expect(translateAuthError('cross-origin request blocked')).toBe(expected);
    expect(translateAuthError('mixed content warning')).toBe(expected);
  });

  it('translates invalid credentials', () => {
    const expected = 'Email atau kata sandi salah. Silakan coba lagi.';
    expect(translateAuthError('invalid login credentials')).toBe(expected);
    expect(translateAuthError('invalid_credentials')).toBe(expected);
  });

  it('translates email not confirmed', () => {
    expect(translateAuthError('email not confirmed')).toBe('Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.');
  });

  it('translates rate limit errors', () => {
    const expected = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.';
    expect(translateAuthError('too many requests from this IP')).toBe(expected);
    expect(translateAuthError('rate limit exceeded')).toBe(expected);
  });

  it('translates user not found', () => {
    expect(translateAuthError('user not found in database')).toBe('Akun tidak ditemukan. Pastikan email yang dimasukkan benar.');
  });

  it('translates already registered errors', () => {
    const expected = 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.';
    expect(translateAuthError('user already registered')).toBe(expected);
    expect(translateAuthError('account already exists')).toBe(expected);
  });

  it('translates short password errors', () => {
    expect(translateAuthError('password should be at least 6 characters')).toBe('Kata sandi terlalu pendek. Gunakan minimal 6 karakter.');
  });

  it('translates weak password errors', () => {
    const expected = 'Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.';
    expect(translateAuthError('weak password detected')).toBe(expected);
    expect(translateAuthError('password strength too low')).toBe(expected);
  });

  it('translates expired token errors', () => {
    const expected = 'Tautan sudah kedaluwarsa. Silakan minta tautan baru.';
    expect(translateAuthError('token expired')).toBe(expected);
    expect(translateAuthError('expired token provided')).toBe(expected);
  });

  it('translates invalid token errors', () => {
    expect(translateAuthError('invalid token signature')).toBe('Tautan tidak valid atau sudah digunakan.');
  });

  it('returns raw message as fallback', () => {
    expect(translateAuthError('some unknown error message')).toBe('some unknown error message');
    expect(translateAuthError('unknown')).toBe('unknown');
  });
});
