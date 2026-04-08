import { describe, expect, it, vi } from 'vitest'

import { exportGradebookToCSV } from '../utils/csvExport'

describe('exportGradebookToCSV', () => {
  it('should trigger CSV download with correct data', () => {
    const mockClick = vi.fn()
    const mockAppend = vi.fn()
    const mockRemove = vi.fn()
    const mockRevoke = vi.fn()

    vi.stubGlobal('document', {
      body: {
        appendChild: mockAppend,
        removeChild: mockRemove,
      },
      createElement: () => ({
        href: '',
        setAttribute: vi.fn(),
        click: mockClick,
        remove: vi.fn(),
      }),
    })

    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:http://localhost',
      revokeObjectURL: mockRevoke,
    })

    const data = {
      entries: [
        {
          id: '1',
          student_id: 'stu-1',
          assignment_id: 'ass-1',
          quiz_id: null,
          score: 85,
          max_score: 100,
          percentage: 85,
          grade_letter: 'B',
        },
      ],
      columns: [
        {
          id: 'ass-1',
          title: 'Tugas 1',
          type: 'assignment' as const,
          max_score: 100,
        },
      ],
      students: [
        {
          id: 'stu-1',
          name: 'John Doe',
          email: 'john@example.com',
        },
      ],
      className: 'Math Class',
    }

    exportGradebookToCSV(data)

    expect(mockClick).toHaveBeenCalled()
    expect(mockRevoke).toHaveBeenCalledWith('blob:http://localhost')
    expect(mockAppend).toHaveBeenCalled()
    expect(mockRemove).toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('should handle empty students gracefully', () => {
    const mockClick = vi.fn()
    const mockAppend = vi.fn()
    const mockRemove = vi.fn()
    const mockRevoke = vi.fn()

    vi.stubGlobal('document', {
      body: {
        appendChild: mockAppend,
        removeChild: mockRemove,
      },
      createElement: () => ({
        href: '',
        setAttribute: vi.fn(),
        click: mockClick,
        remove: vi.fn(),
      }),
    })

    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:http://localhost',
      revokeObjectURL: mockRevoke,
    })

    const data = {
      entries: [],
      columns: [],
      students: [],
      className: 'Empty Class',
    }

    exportGradebookToCSV(data)

    expect(mockClick).toHaveBeenCalled()
    expect(mockAppend).toHaveBeenCalled()
    expect(mockRemove).toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('should generate filename with class name', () => {
    const mockClick = vi.fn()
    const mockAppend = vi.fn()
    const mockRemove = vi.fn()

    vi.stubGlobal('document', {
      body: {
        appendChild: mockAppend,
        removeChild: mockRemove,
      },
      createElement: vi.fn().mockImplementation((tag) => {
        if (tag === 'a') {
          return {
            href: '',
            download: '',
            setAttribute: vi.fn(),
            click: mockClick,
            remove: vi.fn(),
          }
        }
        return {}
      }),
    })

    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:http://localhost',
      revokeObjectURL: vi.fn(),
    })

    const data = {
      entries: [],
      columns: [],
      students: [],
      className: 'Science 101',
    }

    exportGradebookToCSV(data)

    expect(mockClick).toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('should generate CSV with correct headers and student data', () => {
    let capturedBlob: Blob | undefined

    vi.stubGlobal('document', {
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
      createElement: vi.fn().mockImplementation((tag: string) => {
        if (tag === 'a') {
          return {
            href: '',
            download: '',
            setAttribute: (_key: string, value: string) => {
              capturedBlob = new Blob([value], { type: 'text/csv;charset=utf-8;' })
            },
            click: vi.fn(),
            remove: vi.fn(),
          }
        }
        return {}
      }),
    })

    vi.stubGlobal('URL', {
      createObjectURL: () => 'blob:http://localhost',
      revokeObjectURL: vi.fn(),
    })

    const data = {
      entries: [
        {
          id: '1',
          student_id: 'stu-1',
          assignment_id: 'ass-1',
          quiz_id: null,
          score: 85,
          max_score: 100,
          percentage: 85,
          grade_letter: 'B',
        },
      ],
      columns: [
        {
          id: 'ass-1',
          title: 'Tugas 1',
          type: 'assignment' as const,
          max_score: 100,
        },
      ],
      students: [
        {
          id: 'stu-1',
          name: 'John Doe',
          email: 'john@example.com',
        },
      ],
      className: 'Test Class',
    }

    exportGradebookToCSV(data)

    expect(capturedBlob).toBeDefined()
    expect(capturedBlob?.type).toContain('text/csv')

    vi.unstubAllGlobals()
  })
})
