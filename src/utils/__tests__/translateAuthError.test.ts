import { describe, expect, it } from 'vitest'

import { translateAuthError } from '../translateAuthError'

describe('translateAuthError', () => {
  it('should return a default error message if message is falsy', () => {
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe('Terjadi kesalahan yang tidak diketahui.')
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe('Terjadi kesalahan yang tidak diketahui.')
    expect(translateAuthError('')).toBe('Terjadi kesalahan yang tidak diketahui.')
  })

  it('should translate network errors', () => {
    const expected = 'Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.'
    expect(translateAuthError('failed to fetch')).toBe(expected)
    expect(translateAuthError('NetworkError when attempting to fetch resource.')).toBe(expected)
    expect(translateAuthError('Load failed')).toBe(expected)
    expect(translateAuthError('CORS error')).toBe(expected)
    expect(translateAuthError('cross-origin request blocked')).toBe(expected)
    expect(translateAuthError('mixed content blocked')).toBe(expected)
  })

  it('should translate invalid credentials errors', () => {
    const expected = 'Email atau kata sandi salah. Silakan coba lagi.'
    expect(translateAuthError('Invalid login credentials')).toBe(expected)
    expect(translateAuthError('invalid_credentials')).toBe(expected)
  })

  it('should translate unconfirmed email errors', () => {
    const expected = 'Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.'
    expect(translateAuthError('Email not confirmed')).toBe(expected)
  })

  it('should translate rate limit errors', () => {
    const expected = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.'
    expect(translateAuthError('Too many requests')).toBe(expected)
    expect(translateAuthError('rate limit exceeded')).toBe(expected)
  })

  it('should translate user not found errors', () => {
    const expected = 'Akun tidak ditemukan. Pastikan email yang dimasukkan benar.'
    expect(translateAuthError('User not found')).toBe(expected)
  })

  it('should translate already registered errors', () => {
    const expected = 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.'
    expect(translateAuthError('User already registered')).toBe(expected)
    expect(translateAuthError('User already exists')).toBe(expected)
  })

  it('should translate short password errors', () => {
    const expected = 'Kata sandi terlalu pendek. Gunakan minimal 6 karakter.'
    expect(translateAuthError('Password should be at least 6 characters')).toBe(expected)
  })

  it('should translate weak password errors', () => {
    const expected = 'Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.'
    expect(translateAuthError('Weak password')).toBe(expected)
    expect(translateAuthError('Password strength is too low')).toBe(expected)
  })

  it('should translate expired token errors', () => {
    const expected = 'Tautan sudah kedaluwarsa. Silakan minta tautan baru.'
    expect(translateAuthError('Token expired')).toBe(expected)
    expect(translateAuthError('expired token')).toBe(expected)
  })

  it('should translate invalid token errors', () => {
    const expected = 'Tautan tidak valid atau sudah digunakan.'
    expect(translateAuthError('Invalid token')).toBe(expected)
  })

  it('should return the original message if unknown', () => {
    expect(translateAuthError('Some random unknown error')).toBe('Some random unknown error')
    expect(translateAuthError('Server 500 error')).toBe('Server 500 error')
  })

  it('should be case insensitive', () => {
    const expected = 'Gagal terhubung ke server. Periksa koneksi Anda atau coba beberapa saat lagi.'
    expect(translateAuthError('FAILED TO FETCH')).toBe(expected)
    expect(translateAuthError('NeTwOrKeRrOr')).toBe(expected)
  })
})
