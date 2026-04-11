import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Supabase Mock ────────────────────────────────────────────────────────────

const mockFrom = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { videoAssetService } from '../api/videoAssetService'
import { videoUploadService } from '../api/videoUploadService'

// ── Helpers ──────────────────────────────────────────────────────────────────

function createChainMock(resolvedValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const promise = Promise.resolve(resolvedValue)
  chain.then = vi.fn(
    (onFulfilled?: (v: unknown) => unknown, onRejected?: (v: unknown) => unknown) =>
      promise.then(onFulfilled, onRejected)
  )
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  return chain
}

// ── videoAssetService Tests ──────────────────────────────────────────────────

describe('videoAssetService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getByBlockId', () => {
    it('mengembalikan video asset yang siap berdasarkan blockId', async () => {
      const chain = createChainMock({
        data: {
          id: 'asset-1',
          block_id: 'block-1',
          lesson_id: null,
          provider: 'direct',
          status: 'ready',
          mp4_url: 'https://cdn.example.com/video.mp4',
          hls_url: null,
          duration_seconds: 120,
          resolution: '1920x1080',
          thumbnail_url: 'https://cdn.example.com/thumb.jpg',
          original_filename: 'lesson1.mp4',
          file_size_bytes: 50000000,
          metadata: {},
          tenant_id: 'tenant-1',
          created_by: 'user-1',
          created_at: '2026-03-01',
          updated_at: '2026-03-01',
        },
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await videoAssetService.getByBlockId('block-1', 'tenant-1')

      expect(mockFrom).toHaveBeenCalledWith('video_assets')
      expect(chain.eq).toHaveBeenCalledWith('block_id', 'block-1')
      expect(result).not.toBeNull()
      expect(result?.status).toBe('ready')
      expect(result?.mp4_url).toBe('https://cdn.example.com/video.mp4')
    })

    it('mengembalikan null ketika tidak ada asset untuk block', async () => {
      const chain = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await videoAssetService.getByBlockId('block-1', 'tenant-1')

      expect(result).toBeNull()
    })

    it('melempar error ketika query gagal', async () => {
      const chain = createChainMock({ data: null, error: { message: 'DB error' } })
      mockFrom.mockReturnValue(chain)

      await expect(videoAssetService.getByBlockId('block-1', 'tenant-1')).rejects.toMatchObject({
        message: 'DB error',
      })
    })
  })

  describe('getByLessonId', () => {
    it('mengembalikan daftar video asset untuk pelajaran', async () => {
      const chain = createChainMock({
        data: [
          { id: 'asset-1', lesson_id: 'lesson-1', status: 'ready', provider: 'direct' },
          { id: 'asset-2', lesson_id: 'lesson-1', status: 'ready', provider: 'youtube' },
        ],
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await videoAssetService.getByLessonId('lesson-1', 'tenant-1')

      expect(mockFrom).toHaveBeenCalledWith('video_assets')
      expect(result).toHaveLength(2)
      expect(chain.eq).toHaveBeenCalledWith('lesson_id', 'lesson-1')
    })

    it('mengembalikan array kosong ketika tidak ada asset', async () => {
      const chain = createChainMock({ data: [], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await videoAssetService.getByLessonId('lesson-1', 'tenant-1')

      expect(result).toEqual([])
    })
  })

  describe('createAsset', () => {
    it('membuat asset video baru dengan status processing', async () => {
      const chain = createChainMock({
        data: {
          id: 'new-asset',
          lesson_id: 'lesson-1',
          block_id: null,
          provider: 'direct',
          status: 'processing',
          original_filename: 'video.mp4',
          file_size_bytes: 100000000,
          metadata: { mime_type: 'video/mp4' },
        },
        error: null,
      })
      mockFrom.mockReturnValue(chain)

      const result = await videoAssetService.createAsset({
        lesson_id: 'lesson-1',
        provider: 'direct',
        original_filename: 'video.mp4',
        file_size_bytes: 100000000,
        metadata: { mime_type: 'video/mp4' },
      })

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          lesson_id: 'lesson-1',
          provider: 'direct',
          status: 'processing',
        })
      )
      expect(result.status).toBe('processing')
    })

    it('melempar error ketika insert gagal', async () => {
      const chain = createChainMock({
        data: null,
        error: { message: 'Insert failed' },
      })
      mockFrom.mockReturnValue(chain)

      await expect(videoAssetService.createAsset({ lesson_id: 'lesson-1' })).rejects.toMatchObject({
        message: 'Insert failed',
      })
    })
  })

  describe('updateAssetStatus', () => {
    it('memperbarui status asset', async () => {
      const chain = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await videoAssetService.updateAssetStatus('asset-1', 'ready', {
        mp4_url: 'https://cdn.example.com/video.mp4',
      })

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
          mp4_url: 'https://cdn.example.com/video.mp4',
        })
      )
    })

    it('melempar error ketika update gagal', async () => {
      const chain = createChainMock({
        data: null,
        error: { message: 'Update failed' },
      })
      mockFrom.mockReturnValue(chain)

      await expect(
        videoAssetService.updateAssetStatus('asset-1', 'error', {
          error_message: 'Transcode failed',
        })
      ).rejects.toMatchObject({ message: 'Update failed' })
    })
  })

  describe('deleteAsset', () => {
    it('menandai asset sebagai deleted (soft delete)', async () => {
      const chain = createChainMock({ data: null, error: null })
      mockFrom.mockReturnValue(chain)

      await videoAssetService.deleteAsset('asset-1', 'tenant-1')

      expect(chain.update).toHaveBeenCalledWith({ status: 'deleted' })
      expect(chain.eq).toHaveBeenCalledWith('id', 'asset-1')
    })

    it('melempar error ketika delete gagal', async () => {
      const chain = createChainMock({
        data: null,
        error: { message: 'Delete failed' },
      })
      mockFrom.mockReturnValue(chain)

      await expect(videoAssetService.deleteAsset('asset-1', 'tenant-1')).rejects.toMatchObject({
        message: 'Delete failed',
      })
    })
  })
})

// ── videoUploadService Tests ─────────────────────────────────────────────────

describe('videoUploadService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateFile', () => {
    it('mengembalikan null untuk file video yang valid', () => {
      const file = { size: 100000000, type: 'video/mp4', name: 'lesson.mp4' } as File

      const result = videoUploadService.validateFile(file)

      expect(result).toBeNull()
    })

    it('mengembalikan error untuk file yang terlalu besar', () => {
      const file = { size: 600 * 1024 * 1024, type: 'video/mp4', name: 'huge.mp4' } as File

      const result = videoUploadService.validateFile(file)

      expect(result).toBe('Ukuran file melebihi batas 500 MB')
    })

    it('mengembalikan error untuk format yang tidak didukung', () => {
      const file = { size: 10000000, type: 'image/png', name: 'photo.png' } as File

      const result = videoUploadService.validateFile(file)

      expect(result).toBe('Format video tidak didukung. Gunakan MP4, WebM, atau MOV')
    })
  })

  describe('uploadVideo', () => {
    it('melempar error validasi ketika file tidak valid', async () => {
      const file = { size: 600 * 1024 * 1024, type: 'video/mp4', name: 'huge.mp4' } as File

      await expect(
        videoUploadService.uploadVideo(file, 'lesson-1', null, 'tenant-1')
      ).rejects.toThrow('Ukuran file melebihi batas 500 MB')
    })

    it('melempar error ketika storage upload gagal', async () => {
      const file = { size: 10000000, type: 'video/mp4', name: 'lesson.mp4' } as File
      const progressFn = vi.fn()

      const mockCreateAsset = vi.fn().mockResolvedValue({
        id: 'asset-1',
        lesson_id: 'lesson-1',
        provider: 'direct',
        status: 'processing',
      })
      const mockUpdateAssetStatus = vi.fn().mockResolvedValue(undefined)

      vi.spyOn(videoAssetService, 'createAsset').mockImplementation(mockCreateAsset)
      vi.spyOn(videoAssetService, 'updateAssetStatus').mockImplementation(mockUpdateAssetStatus)

      const mockStorageUpload = vi.fn().mockResolvedValue({
        error: { message: 'Storage full' },
      })
      const mockStorageFrom = vi.fn().mockReturnValue({
        upload: mockStorageUpload,
      })

      vi.mocked(await import('@/services/db')).db.storage = {
        from: mockStorageFrom,
      } as unknown as typeof import('@/services/db').db.storage

      await expect(
        videoUploadService.uploadVideo(file, 'lesson-1', null, 'tenant-1', progressFn)
      ).rejects.toMatchObject({ message: 'Storage full' })

      expect(mockUpdateAssetStatus).toHaveBeenCalledWith('asset-1', 'error', {
        error_message: 'Storage full',
      })
    })
  })
})
