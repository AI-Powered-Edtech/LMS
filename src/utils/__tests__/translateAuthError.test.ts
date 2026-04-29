import { describe, expect, it } from 'vitest'

import { translateAuthError } from '../translateAuthError'

describe('translateAuthError', () => {
  it('should translate network errors', () => {
    const expected = 'Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.'
    expect(translateAuthError('failed to fetch')).toBe(expected)
    expect(translateAuthError('NetworkError')).toBe(expected)
    expect(translateAuthError('load failed')).toBe(expected)
    expect(translateAuthError('cors error')).toBe(expected)
    expect(translateAuthError('cross-origin request blocked')).toBe(expected)
    expect(translateAuthError('mixed content warning')).toBe(expected)
  })

  it('should translate invalid login credentials', () => {
    const expected = 'Email atau kata sandi salah. Silakan coba lagi.'
    expect(translateAuthError('invalid login credentials')).toBe(expected)
    expect(translateAuthError('invalid_credentials')).toBe(expected)
  })

  it('should translate email not confirmed', () => {
    const expected = 'Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.'
    expect(translateAuthError('Email not confirmed')).toBe(expected)
  })

  it('should translate rate limiting', () => {
    const expected = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.'
    expect(translateAuthError('Too many requests')).toBe(expected)
    expect(translateAuthError('rate limit exceeded')).toBe(expected)
  })

  it('should translate user not found', () => {
    const expected = 'Akun tidak ditemukan. Pastikan email yang dimasukkan benar.'
    expect(translateAuthError('User not found')).toBe(expected)
  })

  it('should translate user already registered', () => {
    const expected = 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.'
    expect(translateAuthError('User already registered')).toBe(expected)
    expect(translateAuthError('user already exists')).toBe(expected)
  })

  it('should translate password too short', () => {
    const expected = 'Kata sandi terlalu pendek. Gunakan minimal 6 karakter.'
    expect(translateAuthError('Password should be at least 6 characters')).toBe(expected)
  })

  it('should translate weak password', () => {
    const expected = 'Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.'
    expect(translateAuthError('weak password')).toBe(expected)
    expect(translateAuthError('password strength is low')).toBe(expected)
  })

  it('should translate token expired', () => {
    const expected = 'Tautan sudah kedaluwarsa. Silakan minta tautan baru.'
    expect(translateAuthError('Token expired')).toBe(expected)
    expect(translateAuthError('expired token')).toBe(expected)
  })

  it('should translate invalid token', () => {
    const expected = 'Tautan tidak valid atau sudah digunakan.'
    expect(translateAuthError('invalid token')).toBe(expected)
  })

  it('should be case insensitive', () => {
    expect(translateAuthError('FAILED TO FETCH')).toBe(
      'Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.'
    )
    expect(translateAuthError('InVaLiD LoGin CReDenTials')).toBe(
      'Email atau kata sandi salah. Silakan coba lagi.'
    )
  })

  it('should return the original message if unknown', () => {
    expect(translateAuthError('unknown error')).toBe('unknown error')
    expect(translateAuthError('Some random message')).toBe('Some random message')
  })

  it('should handle empty or falsy values gracefully', () => {
    expect(translateAuthError('')).toBe('Terjadi kesalahan yang tidak diketahui.')
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe('Terjadi kesalahan yang tidak diketahui.')
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe('Terjadi kesalahan yang tidak diketahui.')
  })
})
