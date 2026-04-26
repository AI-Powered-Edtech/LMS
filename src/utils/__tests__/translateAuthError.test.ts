import { describe, expect, it } from 'vitest'

import { translateAuthError } from '../translateAuthError'

describe('translateAuthError', () => {
  it('should return a generic message for empty strings', () => {
    expect(translateAuthError('')).toBe('Terjadi kesalahan yang tidak diketahui.')
  })

  it('should return a generic message for undefined/null input', () => {
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe('Terjadi kesalahan yang tidak diketahui.')
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe('Terjadi kesalahan yang tidak diketahui.')
  })

  it('should translate network and connection errors', () => {
    const expected = 'Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.'
    expect(translateAuthError('Failed to fetch data')).toBe(expected)
    expect(translateAuthError('NetworkError when attempting to fetch resource.')).toBe(expected)
    expect(translateAuthError('Load failed')).toBe(expected)
    expect(translateAuthError('CORS policy error')).toBe(expected)
    expect(translateAuthError('cross-origin request blocked')).toBe(expected)
    expect(translateAuthError('mixed content warning')).toBe(expected)
  })

  it('should translate invalid credentials error', () => {
    const expected = 'Email atau kata sandi salah. Silakan coba lagi.'
    expect(translateAuthError('invalid login credentials')).toBe(expected)
    expect(translateAuthError('invalid_credentials')).toBe(expected)
  })

  it('should translate unconfirmed email error', () => {
    const expected = 'Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.'
    expect(translateAuthError('Email not confirmed')).toBe(expected)
  })

  it('should translate rate limit error', () => {
    const expected = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.'
    expect(translateAuthError('too many requests from this IP')).toBe(expected)
    expect(translateAuthError('Rate limit exceeded')).toBe(expected)
  })

  it('should translate user not found error', () => {
    const expected = 'Akun tidak ditemukan. Pastikan email yang dimasukkan benar.'
    expect(translateAuthError('User not found')).toBe(expected)
  })

  it('should translate user already registered error', () => {
    const expected = 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.'
    expect(translateAuthError('User already registered')).toBe(expected)
    expect(translateAuthError('Email already exists')).toBe(expected)
  })

  it('should translate weak/short password error', () => {
    const shortExpected = 'Kata sandi terlalu pendek. Gunakan minimal 6 karakter.'
    expect(translateAuthError('Password should be at least 6 characters')).toBe(shortExpected)

    const weakExpected = 'Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.'
    expect(translateAuthError('Weak password provided')).toBe(weakExpected)
    expect(translateAuthError('Password strength is insufficient')).toBe(weakExpected)
  })

  it('should translate token expiration and invalid token errors', () => {
    const expiredExpected = 'Tautan sudah kedaluwarsa. Silakan minta tautan baru.'
    expect(translateAuthError('Token expired')).toBe(expiredExpected)
    expect(translateAuthError('Expired token')).toBe(expiredExpected)

    const invalidExpected = 'Tautan tidak valid atau sudah digunakan.'
    expect(translateAuthError('Invalid token provided')).toBe(invalidExpected)
  })

  it('should fallback to the raw message if it is unknown', () => {
    const unknownError = 'Something completely weird happened.'
    expect(translateAuthError(unknownError)).toBe(unknownError)
  })
})
