import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── DB Mock ─────────────────────────────────────────────────────────────────

const mockFrom = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import { certificateTemplateService } from '../api/certificateTemplateService'
import type { CertificateTemplate } from '../types'

// ── Helpers ─────────────────────────────────────────────────────────────────

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
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  return chain
}

function makeTemplate(overrides?: Partial<CertificateTemplate>): CertificateTemplate {
  return {
    id: 'tmpl-1',
    course_id: null,
    name: 'Template Resmi',
    background_color: '#ffffff',
    accent_color: '#2563eb',
    logo_url: null,
    header_text: 'Sertifikat Penyelesaian',
    body_text: 'Dengan bangga diberikan kepada',
    footer_text: 'atas keberhasilan menyelesaikan kursus',
    show_date: true,
    show_score: false,
    show_teacher_sig: true,
    font_family: 'serif',
    is_default: false,
    tenant_id: 'tenant-1',
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── getTemplates ────────────────────────────────────────────────────────────

describe('certificateTemplateService — getTemplates', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mengembalikan daftar template untuk tenant', async () => {
    const templates = [
      makeTemplate({ name: 'Alpha' }),
      makeTemplate({ name: 'Beta', is_default: true }),
    ]
    const chain = createChainMock({ data: templates, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await certificateTemplateService.getTemplates('tenant-1')

    expect(mockFrom).toHaveBeenCalledWith('certificate_templates')
    expect(chain.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1')
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Alpha')
  })

  it('mengembalikan array kosong jika data null', async () => {
    const chain = createChainMock({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await certificateTemplateService.getTemplates('tenant-1')
    expect(result).toEqual([])
  })

  it('throw error jika query gagal', async () => {
    const chain = createChainMock({ data: null, error: { message: 'DB error' } })
    mockFrom.mockReturnValue(chain)

    await expect(certificateTemplateService.getTemplates('tenant-1')).rejects.toThrow('DB error')
  })
})

// ── getTemplateByCourse ─────────────────────────────────────────────────────

describe('certificateTemplateService — getTemplateByCourse', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mengembalikan template spesifik kursus jika ada', async () => {
    const tmpl = makeTemplate({ course_id: 'course-1' })
    const chain = createChainMock({ data: tmpl, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await certificateTemplateService.getTemplateByCourse('course-1', 'tenant-1')

    expect(result).not.toBeNull()
    expect(result!.course_id).toBe('course-1')
  })

  it('fallback ke template default jika tidak ada template spesifik', async () => {
    const defaultTmpl = makeTemplate({ is_default: true })
    // First call: course-specific — returns null
    const courseChain = createChainMock({ data: null, error: null })
    // Second call: default — returns template
    const defaultChain = createChainMock({ data: defaultTmpl, error: null })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      return callCount === 1 ? courseChain : defaultChain
    })

    const result = await certificateTemplateService.getTemplateByCourse('course-99', 'tenant-1')

    expect(result).not.toBeNull()
    expect(result!.is_default).toBe(true)
  })

  it('mengembalikan null jika tidak ada template sama sekali', async () => {
    const chain = createChainMock({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await certificateTemplateService.getTemplateByCourse('course-1', 'tenant-1')
    expect(result).toBeNull()
  })
})

// ── saveTemplate ────────────────────────────────────────────────────────────

describe('certificateTemplateService — saveTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mengupdate template yang sudah ada jika id diberikan', async () => {
    const updated = makeTemplate({ name: 'Updated Name' })
    const chain = createChainMock({ data: updated, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await certificateTemplateService.saveTemplate(
      {
        id: 'tmpl-1',
        name: 'Updated Name',
        course_id: null,
        background_color: '#fff',
        accent_color: '#000',
        logo_url: null,
        header_text: 'H',
        body_text: 'B',
        footer_text: 'F',
        show_date: true,
        show_score: false,
        show_teacher_sig: true,
        font_family: 'serif',
        is_default: false,
      },
      'tenant-1'
    )

    expect(chain.update).toHaveBeenCalled()
    expect(result.name).toBe('Updated Name')
  })

  it('insert template baru jika id tidak diberikan', async () => {
    const newTmpl = makeTemplate({ id: 'new-id', name: 'New Template' })
    const chain = createChainMock({ data: newTmpl, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await certificateTemplateService.saveTemplate(
      {
        name: 'New Template',
        course_id: null,
        background_color: '#fff',
        accent_color: '#000',
        logo_url: null,
        header_text: 'H',
        body_text: 'B',
        footer_text: 'F',
        show_date: true,
        show_score: false,
        show_teacher_sig: true,
        font_family: 'serif',
        is_default: false,
      },
      'tenant-1'
    )

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: 'tenant-1', name: 'New Template' })
    )
    expect(result.name).toBe('New Template')
  })

  it('throw error jika update gagal', async () => {
    const chain = createChainMock({ data: null, error: { message: 'Update failed' } })
    mockFrom.mockReturnValue(chain)

    await expect(
      certificateTemplateService.saveTemplate(
        {
          id: 'tmpl-1',
          name: 'Fail',
          course_id: null,
          background_color: '#fff',
          accent_color: '#000',
          logo_url: null,
          header_text: 'H',
          body_text: 'B',
          footer_text: 'F',
          show_date: true,
          show_score: false,
          show_teacher_sig: true,
          font_family: 'serif',
          is_default: false,
        },
        'tenant-1'
      )
    ).rejects.toThrow('Update failed')
  })
})

// ── setDefault ──────────────────────────────────────────────────────────────

describe('certificateTemplateService — setDefault', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mengclear semua default lalu set template baru sebagai default', async () => {
    const clearChain = createChainMock({ data: null, error: null })
    const setChain = createChainMock({ data: null, error: null })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      return callCount === 1 ? clearChain : setChain
    })

    await certificateTemplateService.setDefault('tmpl-1', 'tenant-1')

    expect(clearChain.update).toHaveBeenCalledWith({ is_default: false })
    expect(setChain.update).toHaveBeenCalledWith({ is_default: true })
  })

  it('throw error jika clear default gagal', async () => {
    const chain = createChainMock({ data: null, error: { message: 'Clear failed' } })
    mockFrom.mockReturnValue(chain)

    await expect(certificateTemplateService.setDefault('tmpl-1', 'tenant-1')).rejects.toThrow(
      'Clear failed'
    )
  })
})

// ── deleteTemplate ──────────────────────────────────────────────────────────

describe('certificateTemplateService — deleteTemplate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('menghapus template berdasarkan id dan tenant', async () => {
    const chain = createChainMock({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    await certificateTemplateService.deleteTemplate('tmpl-1', 'tenant-1')

    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1')
  })

  it('throw error jika delete gagal', async () => {
    const chain = createChainMock({ data: null, error: { message: 'Delete failed' } })
    mockFrom.mockReturnValue(chain)

    await expect(certificateTemplateService.deleteTemplate('tmpl-1', 'tenant-1')).rejects.toThrow(
      'Delete failed'
    )
  })
})
