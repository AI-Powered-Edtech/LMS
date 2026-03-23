import { beforeEach, describe, expect, it, vi } from 'vitest'

import { storageService } from '../api/storageService'

const { mockStorageRemove, mockStorageFrom, mockSingle, mockFrom } = vi.hoisted(() => {
  const mockStorageRemove = vi.fn()
  const mockStorageFrom = vi.fn(() => ({
    remove: mockStorageRemove,
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/file.png' } })),
  }))

  const mockSingle = vi.fn()
  const mockFrom = vi.fn(() => ({}))

  return {
    mockStorageRemove,
    mockStorageFrom,
    mockSingle,
    mockFrom,
  }
})

vi.mock('@/src/services/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    storage: {
      from: mockStorageFrom,
    },
  },
}))

describe('storageService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
