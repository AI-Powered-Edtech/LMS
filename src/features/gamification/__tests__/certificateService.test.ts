import { beforeEach, describe, expect, it, vi } from 'vitest'

import { certificateService } from '../api/certificateService'

// Mock db
const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock('@/services/db', () => ({
  db: {
    functions: {
      invoke: mockInvoke,
    },
  },
}))

describe('certificateService.generatePdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns Blob on success', async () => {
    const mockBlob = new Blob(['pdf'], { type: 'application/pdf' })
    mockInvoke.mockResolvedValue({ data: mockBlob, error: null })

    const params = {
      studentName: 'John Doe',
      courseTitle: 'Math 101',
      completionDate: '2026-04-01',
      tenantName: 'School ABC',
      certificateNumber: 'CERT-123',
    }

    const result = await certificateService.generatePdf(params)
    expect(result).toBeInstanceOf(Blob)
    expect(result.type).toBe('application/pdf')
  })

  it('wraps Blob correctly if not Blob', async () => {
    mockInvoke.mockResolvedValue({ data: 'pdf data', error: null })

    const params = {
      studentName: 'John Doe',
      courseTitle: 'Math 101',
      completionDate: '2026-04-01',
      tenantName: 'School ABC',
      certificateNumber: 'CERT-123',
    }

    const result = await certificateService.generatePdf(params)
    expect(result).toBeInstanceOf(Blob)
    expect(result.type).toBe('application/pdf')
  })

  it('throws custom error for missing function', async () => {
    mockInvoke.mockRejectedValue({
      message: 'generate-pdf function not found',
      code: 'PGRST202',
    })

    const params = {
      studentName: 'John Doe',
      courseTitle: 'Math 101',
      completionDate: '2026-04-01',
      tenantName: 'School ABC',
      certificateNumber: 'CERT-123',
    }

    await expect(certificateService.generatePdf(params)).rejects.toThrow(
      'Layanan pembuatan sertifikat sedang tidak tersedia. Coba lagi nanti.'
    )
  })

  it('throws original error for other issues', async () => {
    mockInvoke.mockRejectedValue(new Error('Network error'))

    const params = {
      studentName: 'John Doe',
      courseTitle: 'Math 101',
      completionDate: '2026-04-01',
      tenantName: 'School ABC',
      certificateNumber: 'CERT-123',
    }

    await expect(certificateService.generatePdf(params)).rejects.toThrow('Network error')
  })
})
