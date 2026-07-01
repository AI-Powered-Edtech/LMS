import { describe, expect,it } from 'vitest';

import { translateAuthError } from '../translateAuthError';

describe('translateAuthError', () => {
  it('returns default message for empty or undefined input', () => {
    expect(translateAuthError('')).toBe('Terjadi kesalahan yang tidak diketahui.');
    // @ts-expect-error testing invalid input type
    expect(translateAuthError(null)).toBe('Terjadi kesalahan yang tidak diketahui.');
    // @ts-expect-error testing invalid input type
    expect(translateAuthError(undefined)).toBe('Terjadi kesalahan yang tidak diketahui.');
  });

  it('translates network-related errors', () => {
    const expected = 'Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.';
    expect(translateAuthError('failed to fetch data')).toBe(expected);
    expect(translateAuthError('networkerror when attempting to fetch resource')).toBe(expected);
    expect(translateAuthError('load failed')).toBe(expected);
    expect(translateAuthError('cors error')).toBe(expected);
    expect(translateAuthError('cross-origin request blocked')).toBe(expected);
    expect(translateAuthError('mixed content error')).toBe(expected);
  });

  it('translates invalid credentials', () => {
    const expected = 'Email atau kata sandi salah. Silakan coba lagi.';
    expect(translateAuthError('invalid login credentials')).toBe(expected);
    expect(translateAuthError('invalid_credentials')).toBe(expected);
  });

  it('translates unconfirmed email', () => {
    expect(translateAuthError('email not confirmed')).toBe('Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.');
  });

  it('translates rate limiting', () => {
    const expected = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.';
    expect(translateAuthError('too many requests to this api')).toBe(expected);
    expect(translateAuthError('rate limit exceeded')).toBe(expected);
  });

  it('translates user not found', () => {
    expect(translateAuthError('user not found in system')).toBe('Akun tidak ditemukan. Pastikan email yang dimasukkan benar.');
  });

  it('translates user already registered', () => {
    const expected = 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.';
    expect(translateAuthError('user already registered')).toBe(expected);
    expect(translateAuthError('user already exists in database')).toBe(expected);
  });

  it('translates password length errors', () => {
    expect(translateAuthError('password should be at least 6 characters')).toBe('Kata sandi terlalu pendek. Gunakan minimal 6 karakter.');
  });

  it('translates weak password errors', () => {
    const expected = 'Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.';
    expect(translateAuthError('weak password detected')).toBe(expected);
    expect(translateAuthError('password strength is too low')).toBe(expected);
  });

  it('translates token expired', () => {
    const expected = 'Tautan sudah kedaluwarsa. Silakan minta tautan baru.';
    expect(translateAuthError('token expired today')).toBe(expected);
    expect(translateAuthError('expired token provided')).toBe(expected);
  });

  it('translates invalid token', () => {
    expect(translateAuthError('invalid token provided')).toBe('Tautan tidak valid atau sudah digunakan.');
  });

  it('returns fallback original message for unknown errors', () => {
    expect(translateAuthError('some weird error')).toBe('some weird error');
    expect(translateAuthError('unhandled exception 123')).toBe('unhandled exception 123');
  });
});
