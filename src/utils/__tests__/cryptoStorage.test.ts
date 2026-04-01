import { describe, it, expect } from 'vitest'
import { encryptData, decryptData } from '../cryptoStorage'

describe('cryptoStorage', () => {
  describe('encryptData dan decryptData', () => {
    it('berhasil mengenkripsi dan mendekripsi string', async () => {
      const userId = 'user-123'
      const originalData = 'Ini adalah pesan rahasia'

      const encrypted = await encryptData(originalData, userId)
      expect(encrypted).toBeTypeOf('string')
      expect(encrypted).not.toBe(originalData)

      const decrypted = await decryptData<string>(encrypted, userId)
      expect(decrypted).toBe(originalData)
    })

    it('berhasil mengenkripsi dan mendekripsi objek JSON', async () => {
      const userId = 'user-456'
      const originalData = { id: 1, name: 'Budi', active: true }

      const encrypted = await encryptData(originalData, userId)
      expect(encrypted).toBeTypeOf('string')

      const decrypted = await decryptData<typeof originalData>(encrypted, userId)
      expect(decrypted).toEqual(originalData)
    })

    it('berhasil mengenkripsi dan mendekripsi angka', async () => {
      const userId = 'user-789'
      const originalData = 42

      const encrypted = await encryptData(originalData, userId)
      const decrypted = await decryptData<number>(encrypted, userId)
      expect(decrypted).toBe(originalData)
    })

    it('berhasil mengenkripsi dan mendekripsi nilai null', async () => {
      const userId = 'user-null'
      const originalData = null

      const encrypted = await encryptData(originalData, userId)
      const decrypted = await decryptData<null>(encrypted, userId)
      expect(decrypted).toBeNull()
    })

    it('berhasil mengenkripsi dan mendekripsi string kosong', async () => {
      const userId = 'user-empty'
      const originalData = ''

      const encrypted = await encryptData(originalData, userId)
      const decrypted = await decryptData<string>(encrypted, userId)
      expect(decrypted).toBe(originalData)
    })

    it('menghasilkan ciphertext yang berbeda untuk data yang sama (IV acak)', async () => {
      const userId = 'user-random-iv'
      const originalData = 'Data rahasia yang sama'

      const encrypted1 = await encryptData(originalData, userId)
      const encrypted2 = await encryptData(originalData, userId)

      // Karena IV acak, ciphertext harusnya berbeda
      expect(encrypted1).not.toBe(encrypted2)

      // Keduanya harus bisa didekripsi kembali ke data yang sama
      const decrypted1 = await decryptData<string>(encrypted1, userId)
      const decrypted2 = await decryptData<string>(encrypted2, userId)
      expect(decrypted1).toBe(originalData)
      expect(decrypted2).toBe(originalData)
    })

    it('gagal mendekripsi jika userId berbeda (kunci salah)', async () => {
      const userId1 = 'user-a'
      const userId2 = 'user-b'
      const originalData = 'Hanya untuk user A'

      const encrypted = await encryptData(originalData, userId1)

      // Mencoba mendekripsi dengan userId yang salah
      await expect(decryptData<string>(encrypted, userId2)).rejects.toThrow()
    })

    it('gagal mendekripsi jika data ciphertext korup (tidak valid Base64)', async () => {
      const userId = 'user-corrupt'
      const invalidEncrypted = 'BukanBase64YangValid!@#'

      // Akan gagal saat atob atau saat dekripsi subtle crypto
      await expect(decryptData<string>(invalidEncrypted, userId)).rejects.toThrow()
    })

    it('gagal mendekripsi jika data ciphertext telah dimodifikasi (Integritas Gagal)', async () => {
      const userId = 'user-tamper'
      const originalData = 'Data penting'

      const encrypted = await encryptData(originalData, userId)

      // Ubah satu karakter di Base64 untuk mensimulasikan tamper/modifikasi
      const tamperedEncrypted = encrypted.substring(0, encrypted.length - 2) + 'a='

      await expect(decryptData<string>(tamperedEncrypted, userId)).rejects.toThrow()
    })
  })
})
