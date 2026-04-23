import { describe, it, expect } from 'vitest'
import { translateAuthError } from '../translateAuthError'

describe('translateAuthError', () => {
  it('returns default error for empty message', () => {
    expect(translateAuthError('')).toBe('Terjadi kesalahan yang tidak diketahui.')
  })

  it('translates connection errors', () => {
    const expected = 'Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.'
    expect(translateAuthError('Failed to fetch')).toBe(expected)
    expect(translateAuthError('NetworkError')).toBe(expected)
    expect(translateAuthError('load failed')).toBe(expected)
    expect(translateAuthError('CORS error')).toBe(expected)
    expect(translateAuthError('Cross-Origin Request Blocked')).toBe(expected)
    expect(translateAuthError('Blocked mixed content')).toBe(expected)
  })

  it('translates invalid login credentials', () => {
    const expected = 'Email atau kata sandi salah. Silakan coba lagi.'
    expect(translateAuthError('Invalid login credentials')).toBe(expected)
    expect(translateAuthError('invalid_credentials')).toBe(expected)
  })

  it('translates unconfirmed email', () => {
    expect(translateAuthError('Email not confirmed')).toBe(
      'Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.'
    )
  })

  it('translates rate limiting', () => {
    const expected = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.'
    expect(translateAuthError('Too many requests')).toBe(expected)
    expect(translateAuthError('rate limit exceeded')).toBe(expected)
  })

  it('translates user not found', () => {
    expect(translateAuthError('User not found')).toBe(
      'Akun tidak ditemukan. Pastikan email yang dimasukkan benar.'
    )
  })

  it('translates already registered', () => {
    const expected = 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.'
    expect(translateAuthError('User already registered')).toBe(expected)
    expect(translateAuthError('user already exists')).toBe(expected)
  })

  it('translates short password', () => {
    expect(translateAuthError('Password should be at least 6 characters')).toBe(
      'Kata sandi terlalu pendek. Gunakan minimal 6 karakter.'
    )
  })

  it('translates weak password', () => {
    const expected = 'Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.'
    expect(translateAuthError('Weak password')).toBe(expected)
    expect(translateAuthError('password strength is too low')).toBe(expected)
  })

  it('translates expired token', () => {
    const expected = 'Tautan sudah kedaluwarsa. Silakan minta tautan baru.'
    expect(translateAuthError('Token expired')).toBe(expected)
    expect(translateAuthError('Expired token')).toBe(expected)
  })

  it('translates invalid token', () => {
    expect(translateAuthError('Invalid token')).toBe(
      'Tautan tidak valid atau sudah digunakan.'
    )
  })

  it('returns raw message as fallback', () => {
    const unknownError = 'Something totally unexpected happened'
    expect(translateAuthError(unknownError)).toBe(unknownError)
  })
})
