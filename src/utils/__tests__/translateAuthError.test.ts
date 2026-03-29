import { describe, expect, it } from 'vitest'

import { translateAuthError } from '../translateAuthError'

describe('translateAuthError', () => {
  it('harus return pesan default untuk string kosong', () => {
    expect(translateAuthError('')).toBe('Terjadi kesalahan yang tidak diketahui.')
  })

  it('harus translate "invalid login credentials"', () => {
    expect(translateAuthError('Invalid login credentials')).toBe(
      'Email atau kata sandi salah. Silakan coba lagi.'
    )
  })

  it('harus translate "invalid_credentials" (underscore format)', () => {
    expect(translateAuthError('invalid_credentials')).toBe(
      'Email atau kata sandi salah. Silakan coba lagi.'
    )
  })

  it('harus translate "email not confirmed"', () => {
    expect(translateAuthError('Email not confirmed')).toBe(
      'Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.'
    )
  })

  it('harus translate "too many requests"', () => {
    expect(translateAuthError('Too many requests')).toBe(
      'Terlalu banyak percobaan. Silakan tunggu beberapa saat.'
    )
  })

  it('harus translate "rate limit" error', () => {
    expect(translateAuthError('rate limit exceeded')).toBe(
      'Terlalu banyak percobaan. Silakan tunggu beberapa saat.'
    )
  })

  it('harus translate "user not found"', () => {
    expect(translateAuthError('User not found')).toBe(
      'Akun tidak ditemukan. Pastikan email yang dimasukkan benar.'
    )
  })

  it('harus translate "user already registered"', () => {
    expect(translateAuthError('User already registered')).toBe(
      'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.'
    )
  })

  it('harus translate "already exists" error', () => {
    expect(translateAuthError('User already exists')).toBe(
      'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.'
    )
  })

  it('harus translate "password should be at least" error', () => {
    expect(translateAuthError('Password should be at least 6 characters')).toBe(
      'Kata sandi terlalu pendek. Gunakan minimal 6 karakter.'
    )
  })

  it('harus translate "weak password" error', () => {
    expect(translateAuthError('Weak password')).toBe(
      'Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.'
    )
  })

  it('harus translate "password strength" error', () => {
    expect(translateAuthError('password strength is insufficient')).toBe(
      'Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.'
    )
  })

  it('harus translate "token expired" error', () => {
    expect(translateAuthError('Token expired')).toBe(
      'Tautan sudah kedaluwarsa. Silakan minta tautan baru.'
    )
  })

  it('harus translate "expired token" error', () => {
    expect(translateAuthError('Expired token')).toBe(
      'Tautan sudah kedaluwarsa. Silakan minta tautan baru.'
    )
  })

  it('harus translate "invalid token" error', () => {
    expect(translateAuthError('Invalid token')).toBe('Tautan tidak valid atau sudah digunakan.')
  })

  it('harus case-insensitive untuk matching pesan', () => {
    expect(translateAuthError('INVALID LOGIN CREDENTIALS')).toBe(
      'Email atau kata sandi salah. Silakan coba lagi.'
    )
  })

  it('harus return pesan asli jika tidak ada match (fallback)', () => {
    const unknownError = 'Unknown error that is not mapped'
    expect(translateAuthError(unknownError)).toBe(unknownError)
  })

  it('harus handle null sebagai string', () => {
    expect(translateAuthError(null as unknown as string)).toBe(
      'Terjadi kesalahan yang tidak diketahui.'
    )
  })
})
