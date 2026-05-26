import { describe, it, expect } from 'vitest';
import { translateAuthError } from '../translateAuthError';

describe('translateAuthError', () => {
  it('should return default message for empty input', () => {
    expect(translateAuthError('')).toBe('Terjadi kesalahan yang tidak diketahui.');
    expect(translateAuthError(null as any)).toBe('Terjadi kesalahan yang tidak diketahui.');
    expect(translateAuthError(undefined as any)).toBe('Terjadi kesalahan yang tidak diketahui.');
  });

  it('should translate network errors', () => {
    const expected = 'Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.';
    expect(translateAuthError('failed to fetch')).toBe(expected);
    expect(translateAuthError('NetworkError')).toBe(expected);
    expect(translateAuthError('Load failed')).toBe(expected);
    expect(translateAuthError('CORS error')).toBe(expected);
    expect(translateAuthError('Cross-origin request blocked')).toBe(expected);
    expect(translateAuthError('Mixed content')).toBe(expected);
  });

  it('should translate invalid credentials', () => {
    const expected = 'Email atau kata sandi salah. Silakan coba lagi.';
    expect(translateAuthError('Invalid login credentials')).toBe(expected);
    expect(translateAuthError('invalid_credentials')).toBe(expected);
  });

  it('should translate unconfirmed email', () => {
    expect(translateAuthError('Email not confirmed')).toBe('Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.');
  });

  it('should translate rate limit errors', () => {
    const expected = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.';
    expect(translateAuthError('Too many requests')).toBe(expected);
    expect(translateAuthError('Rate limit exceeded')).toBe(expected);
  });

  it('should translate user not found', () => {
    expect(translateAuthError('User not found in database')).toBe('Akun tidak ditemukan. Pastikan email yang dimasukkan benar.');
  });

  it('should translate user already exists', () => {
    const expected = 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.';
    expect(translateAuthError('User already registered')).toBe(expected);
    expect(translateAuthError('User already exists')).toBe(expected);
  });

  it('should translate password too short', () => {
    expect(translateAuthError('Password should be at least 6 characters')).toBe('Kata sandi terlalu pendek. Gunakan minimal 6 karakter.');
  });

  it('should translate weak password', () => {
    const expected = 'Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.';
    expect(translateAuthError('Weak password')).toBe(expected);
    expect(translateAuthError('Password strength is low')).toBe(expected);
  });

  it('should translate token expired', () => {
    const expected = 'Tautan sudah kedaluwarsa. Silakan minta tautan baru.';
    expect(translateAuthError('Token expired')).toBe(expected);
    expect(translateAuthError('Expired token')).toBe(expected);
  });

  it('should translate invalid token', () => {
    expect(translateAuthError('Invalid token')).toBe('Tautan tidak valid atau sudah digunakan.');
  });

  it('should fallback to raw message if unknown', () => {
    const unknownMessage = 'Some strange unknown error occurred';
    expect(translateAuthError(unknownMessage)).toBe(unknownMessage);
  });
});
