import { describe, it, expect } from 'vitest'
import { translateAuthError } from '../translateAuthError'

describe('translateAuthError', () => {
  it('returns a default message for empty or falsy inputs', () => {
    expect(translateAuthError('')).toBe('Terjadi kesalahan yang tidak diketahui.')
    // @ts-expect-error testing invalid input
    expect(translateAuthError(null)).toBe('Terjadi kesalahan yang tidak diketahui.')
    // @ts-expect-error testing invalid input
    expect(translateAuthError(undefined)).toBe('Terjadi kesalahan yang tidak diketahui.')
  })

  it('translates "invalid login credentials" or "invalid_credentials"', () => {
    const expected = 'Email atau kata sandi salah. Silakan coba lagi.'
    expect(translateAuthError('Invalid login credentials')).toBe(expected)
    expect(translateAuthError('invalid_credentials')).toBe(expected)
    expect(translateAuthError('Error: Invalid login credentials provided')).toBe(expected)
  })

  it('translates "email not confirmed"', () => {
    const expected = 'Email belum dikonfirmasi. Silakan cek kotak masuk email Anda.'
    expect(translateAuthError('Email not confirmed')).toBe(expected)
    expect(translateAuthError('ERROR: email not confirmed!')).toBe(expected)
  })

  it('translates "too many requests" or "rate limit"', () => {
    const expected = 'Terlalu banyak percobaan. Silakan tunggu beberapa saat.'
    expect(translateAuthError('Too many requests')).toBe(expected)
    expect(translateAuthError('Rate limit exceeded')).toBe(expected)
    expect(translateAuthError('Error: Too Many Requests from this IP')).toBe(expected)
  })

  it('translates "user not found"', () => {
    const expected = 'Akun tidak ditemukan. Pastikan email yang dimasukkan benar.'
    expect(translateAuthError('User not found')).toBe(expected)
    expect(translateAuthError('user not found in database')).toBe(expected)
  })

  it('translates "user already registered" or "already exists"', () => {
    const expected = 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.'
    expect(translateAuthError('User already registered')).toBe(expected)
    expect(translateAuthError('Email already exists in system')).toBe(expected)
  })

  it('translates "password should be at least"', () => {
    const expected = 'Kata sandi terlalu pendek. Gunakan minimal 6 karakter.'
    expect(translateAuthError('Password should be at least 6 characters')).toBe(expected)
  })

  it('translates "weak password" or "password strength"', () => {
    const expected = 'Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka.'
    expect(translateAuthError('Weak password')).toBe(expected)
    expect(translateAuthError('Password strength is too low')).toBe(expected)
  })

  it('translates "token expired" or "expired token"', () => {
    const expected = 'Tautan sudah kedaluwarsa. Silakan minta tautan baru.'
    expect(translateAuthError('Token expired')).toBe(expected)
    expect(translateAuthError('Expired token provided')).toBe(expected)
  })

  it('translates "invalid token"', () => {
    const expected = 'Tautan tidak valid atau sudah digunakan.'
    expect(translateAuthError('Invalid token')).toBe(expected)
    expect(translateAuthError('Error: Invalid token passed')).toBe(expected)
  })

  it('is case insensitive', () => {
    const expected = 'Email atau kata sandi salah. Silakan coba lagi.'
    expect(translateAuthError('INVALID LOGIN CREDENTIALS')).toBe(expected)
    expect(translateAuthError('InVaLiD_CrEdEnTiAlS')).toBe(expected)
  })

  it('returns the raw message if no keywords match', () => {
    expect(translateAuthError('Some random database error')).toBe('Some random database error')
    expect(translateAuthError('Network timeout')).toBe('Network timeout')
    expect(translateAuthError('500 Internal Server Error')).toBe('500 Internal Server Error')
  })
})
