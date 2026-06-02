import { describe, it, expect } from 'vitest';
import { translateAuthError } from '../translateAuthError';

describe('translateAuthError', () => {
  it('handles empty or undefined input', () => {
    expect(translateAuthError('')).toBe('Terjadi kesalahan yang tidak diketahui.');
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe('Terjadi kesalahan yang tidak diketahui.');
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe('Terjadi kesalahan yang tidak diketahui.');
  });

  it('translates network errors', () => {
    expect(translateAuthError('Failed to fetch data')).toBe('Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.');
    expect(translateAuthError('NetworkError when attempting to fetch resource.')).toBe('Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.');
    expect(translateAuthError('The script load failed.')).toBe('Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.');
    expect(translateAuthError('CORS policy')).toBe('Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.');
    expect(translateAuthError('cross-origin request')).toBe('Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.');
    expect(translateAuthError('blocked by mixed content')).toBe('Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.');
  });

  it('translates invalid credentials errors', () => {
    expect(translateAuthError('invalid login credentials')).toBe('Email atau kata sandi salah. Silakan coba lagi.');
    expect(translateAuthError('invalid_credentials')).toBe('Email atau kata sandi salah. Silakan coba lagi.');
  });

  it('translates email not confirmed error', () => {
    expect(translateAuthError('Email not confirmed')).toBe('Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.');
  });

  it('translates rate limit errors', () => {
    expect(translateAuthError('Too many requests')).toBe('Terlalu banyak percobaan. Silakan tunggu beberapa saat.');
    expect(translateAuthError('rate limit exceeded')).toBe('Terlalu banyak percobaan. Silakan tunggu beberapa saat.');
  });

  it('translates user not found error', () => {
    expect(translateAuthError('User not found')).toBe('Akun tidak ditemukan. Pastikan email yang dimasukkan benar.');
  });

  it('translates user already registered errors', () => {
    expect(translateAuthError('User already registered')).toBe('Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.');
    expect(translateAuthError('User already exists')).toBe('Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.');
  });

  it('translates password length error', () => {
    expect(translateAuthError('Password should be at least 6 characters')).toBe('Kata sandi terlalu pendek. Gunakan minimal 6 karakter.');
  });

  it('translates weak password errors', () => {
    expect(translateAuthError('Weak password')).toBe('Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.');
    expect(translateAuthError('password strength is low')).toBe('Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.');
  });

  it('translates token expired errors', () => {
    expect(translateAuthError('Token expired')).toBe('Tautan sudah kedaluwarsa. Silakan minta tautan baru.');
    expect(translateAuthError('expired token')).toBe('Tautan sudah kedaluwarsa. Silakan minta tautan baru.');
  });

  it('translates invalid token error', () => {
    expect(translateAuthError('Invalid token')).toBe('Tautan tidak valid atau sudah digunakan.');
  });

  it('returns fallback for unknown errors', () => {
    expect(translateAuthError('Some random unknown error')).toBe('Some random unknown error');
  });
});
