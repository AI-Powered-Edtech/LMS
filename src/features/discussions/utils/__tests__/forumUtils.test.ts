import { describe, it, expect } from 'vitest'
import { checkProfanity } from '../forumUtils'

describe('checkProfanity', () => {
  it('should return false for clean text', () => {
    expect(checkProfanity('Halo, apa kabar?')).toBe(false)
    expect(checkProfanity('Ini adalah diskusi yang sehat.')).toBe(false)
  })

  it('should return true for text containing exact bad words', () => {
    expect(checkProfanity('dasar bodoh')).toBe(true)
    expect(checkProfanity('kamu goblok ya')).toBe(true)
    expect(checkProfanity('tolol sekali')).toBe(true)
    expect(checkProfanity('anjing kamu')).toBe(true)
  })

  it('should return true for text containing bad words in mixed case', () => {
    expect(checkProfanity('BoDoh')).toBe(true)
    expect(checkProfanity('Goblok')).toBe(true)
    expect(checkProfanity('TOLOL')).toBe(true)
    expect(checkProfanity('anJing')).toBe(true)
  })

  it('should return true for text containing bad words within other words', () => {
    expect(checkProfanity('kebodohan')).toBe(true)
    expect(checkProfanity('kegoblokan')).toBe(true)
    expect(checkProfanity('ketololan')).toBe(true)
    expect(checkProfanity('menganjingkan')).toBe(true)
  })
})
