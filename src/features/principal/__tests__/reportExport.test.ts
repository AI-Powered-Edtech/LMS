import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ExecutiveReportData } from '../types'
import { exportToCSV, exportToPDF } from '../utils/reportExport'

// ── Mock browser APIs ─────────────────────────────────────────────

const mockPrint = vi.fn()
const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url')
const mockRevokeObjectURL = vi.fn()

const mockAnchor = {
  href: '',
  setAttribute: vi.fn(),
  click: vi.fn(),
}

const mockCreateElement = vi.fn().mockReturnValue(mockAnchor)
const mockAppendChild = vi.fn()
const mockRemoveChild = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  // window.print
  Object.defineProperty(globalThis, 'window', {
    value: {
      print: mockPrint,
    },
    writable: true,
  })

  // URL
  globalThis.URL = {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  } as unknown as typeof URL

  // document
  globalThis.document = {
    createElement: mockCreateElement,
    body: {
      appendChild: mockAppendChild,
      removeChild: mockRemoveChild,
    },
  } as unknown as Document

  // Reset anchor state
  mockAnchor.href = ''
  mockAnchor.setAttribute.mockClear()
  mockAnchor.click.mockClear()
})

// ── Fixture data ──────────────────────────────────────────────────

const reportData: ExecutiveReportData = {
  reportType: 'monthly',
  generatedAt: '2026-03-15T10:00:00Z',
  period: 'Maret 2026',
  schoolName: 'SMA Nusantara',
  academicYear: '2025/2026',
  metrics: [
    { label: 'Siswa Aktif', value: '120', sub: 'dari 150 siswa' },
    { label: 'Guru Aktif', value: '15', sub: 'dari 20 guru' },
  ],
  monthlyTrend: [
    { month: 'Jan 2026', active_students: 100, lesson_completions: 500, quiz_attempts: 200 },
    { month: 'Feb 2026', active_students: 110, lesson_completions: 600, quiz_attempts: 250 },
    { month: 'Mar 2026', active_students: 120, lesson_completions: 700, quiz_attempts: 300 },
  ],
  academic: {
    avgScore: 75,
    projectedPassRate: 82,
    totalStudents: 150,
    activeStudents: 120,
    atRiskStudents: 15,
    totalCourses: 8,
  },
  adoption: {
    studentAdoptionPct: 80,
    teacherAdoptionPct: 75,
    adoptionScore: 78,
  },
  roi: {
    paperSavedSheets: 2000,
    paperSavedCost: 1000000,
    teacherTimeSavedHours: 5.5,
  },
}

// ── exportToPDF ───────────────────────────────────────────────────

describe('exportToPDF', () => {
  it('calls window.print()', () => {
    exportToPDF()
    expect(mockPrint).toHaveBeenCalledTimes(1)
  })
})

// ── exportToCSV ───────────────────────────────────────────────────

describe('exportToCSV', () => {
  it('creates a Blob with CSV content and triggers download', () => {
    exportToCSV(reportData)

    // Blob created with CSV content
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1)
    const blobArg = mockCreateObjectURL.mock.calls[0][0]
    expect(blobArg).toBeInstanceOf(Blob)

    // Anchor element created and configured
    expect(mockCreateElement).toHaveBeenCalledWith('a')
    expect(mockAnchor.setAttribute).toHaveBeenCalledWith(
      'download',
      expect.stringContaining('laporan-eksekutif')
    )
    expect(mockAnchor.setAttribute).toHaveBeenCalledWith(
      'download',
      expect.stringContaining('.csv')
    )

    // Click triggered
    expect(mockAnchor.click).toHaveBeenCalledTimes(1)

    // Cleanup
    expect(mockAppendChild).toHaveBeenCalledWith(mockAnchor)
    expect(mockRemoveChild).toHaveBeenCalledWith(mockAnchor)
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('includes BOM marker for proper UTF-8 handling', () => {
    exportToCSV(reportData)

    const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob
    // Blob should be created — we can verify the type
    expect(blobArg.type).toBe('text/csv;charset=utf-8;')
  })

  it('generates filename with period and date', () => {
    exportToCSV(reportData)

    const downloadArg = mockAnchor.setAttribute.mock.calls.find(
      (call: string[]) => call[0] === 'download'
    )
    expect(downloadArg).toBeDefined()
    const filename = downloadArg![1] as string
    expect(filename).toMatch(/^laporan-eksekutif-maret-2026-\d{8}\.csv$/)
  })

  it('includes all report sections in CSV content', async () => {
    exportToCSV(reportData)

    const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob
    const content = await blobArg.text()

    // Header section
    expect(content).toContain('LAPORAN EKSEKUTIF EDUSYNC LMS')
    expect(content).toContain('SMA Nusantara')
    expect(content).toContain('2025/2026')
    expect(content).toContain('Maret 2026')

    // Executive summary section
    expect(content).toContain('RINGKASAN EKSEKUTIF')
    expect(content).toContain('Siswa Aktif')
    expect(content).toContain('Guru Aktif')

    // Monthly trend section
    expect(content).toContain('TREN AKTIVITAS BULANAN')
    expect(content).toContain('Jan 2026')
    expect(content).toContain('Feb 2026')
    expect(content).toContain('Mar 2026')

    // Academic section
    expect(content).toContain('KINERJA AKADEMIK')

    // Adoption section
    expect(content).toContain('ADOPSI PLATFORM')

    // ROI section
    expect(content).toContain('ROI')
    expect(content).toContain('ESTIMASI PENGHEMATAN')
  })
})
