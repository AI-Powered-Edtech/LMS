import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setStorageProvider } from '@/services/storage'

import { storageService } from '../api/storageService'

const { mockStorageRemove, mockStorageFrom, mockSingle, mockFrom } = vi.hoisted(() => {
  const mockStorageRemove = vi.fn()
  const mockStorageFrom = vi.fn(() => ({
    remove: mockStorageRemove,
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/file.png' } })),
  }))

  const mockSingle = vi.fn()
  const mockEq = vi.fn(() => ({ single: mockSingle }))
  const mockSelect = vi.fn(() => ({ eq: mockEq, single: mockSingle }))
  const mockFrom = vi.fn(() => ({ select: mockSelect, delete: vi.fn(() => ({ eq: mockEq })) }))

  return {
    mockStorageRemove,
    mockStorageFrom,
    mockSingle,
    mockFrom,
  }
})

vi.mock('@/services/db', () => ({
  db: {
    from: mockFrom,
    storage: {
      from: mockStorageFrom,
    },
  },
}))

describe('storageService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setStorageProvider({ from: (bucket: string) => (mockStorageFrom as any)(bucket) } as any)
  })

  describe('getPublicUrl', () => {
    it('harus mengembalikan public URL dari storage', () => {
      const url = storageService.getPublicUrl('course-images', 'path/to/file.png')
      expect(mockStorageFrom).toHaveBeenCalledWith('course-images')
      expect(url).toBe('https://example.com/file.png')
    })
  })

  describe('deleteFile', () => {
    it('harus menghapus file dari storage dan database', async () => {
      mockSingle.mockResolvedValue({
        data: { bucket: 'course-images', object_path: 'tenant/file.png' },
        error: null,
      })
      mockStorageRemove.mockResolvedValue({ error: null })

      await storageService.deleteFile('obj-1')
      expect(mockFrom).toHaveBeenCalledWith('storage_objects')
      expect(mockStorageFrom).toHaveBeenCalledWith('course-images')
      expect(mockStorageRemove).toHaveBeenCalledWith(['tenant/file.png'])
    })

    it('harus throw error saat storage object tidak ditemukan', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } })

      await expect(storageService.deleteFile('obj-1')).rejects.toThrow(
        'Failed to fetch storage object'
      )
    })
  })
})
