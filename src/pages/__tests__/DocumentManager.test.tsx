import { describe, expect, it, vi } from 'vitest'

import { renderWithAllProviders } from '@/testing/test-utils'

import { DocumentManager } from '../DocumentManager'

// Mock the documentApi
vi.mock('@/features/administration/api/documentApi', () => ({
  documentApi: {
    getDocuments: vi.fn().mockResolvedValue([]),
    getCategoryCounts: vi.fn().mockResolvedValue({
      surat_masuk: 0,
      surat_keluar: 0,
      sk: 0,
      pengumuman: 0,
      rapor: 0,
      umum: 0,
    }),
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}))

describe('DocumentManager', () => {
  it('renders without crashing', () => {
    const { container } = renderWithAllProviders(<DocumentManager />)
    expect(container).toBeTruthy()
  })
})
