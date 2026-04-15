import { beforeEach, describe, expect, it, vi } from 'vitest'

import { certificateService } from '../api/certificateService'

describe('certificateService.generatePdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('returns Blob on success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(new Blob(['pdf'], { type: 'application/pdf' }), {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      })
    )

    const params = {
      studentName: 'John Doe',
      courseTitle: 'Math 101',
      completionDate: '2026-04-01',
      tenantName: 'School ABC',
      certificateNumber: 'CERT-123',
    }

    const result = await certificateService.generatePdf(params)
    expect(result).toBeInstanceOf(Blob)
    expect(result.type).toContain('application/pdf')
  })

  it('throws custom error for missing function', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('not found', { status: 404 }))

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
    vi.mocked(fetch).mockResolvedValue(new Response('error', { status: 500 }))

    const params = {
      studentName: 'John Doe',
      courseTitle: 'Math 101',
      completionDate: '2026-04-01',
      tenantName: 'School ABC',
      certificateNumber: 'CERT-123',
    }

    await expect(certificateService.generatePdf(params)).rejects.toThrow('HTTP 500')
  })
})
