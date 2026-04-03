import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SurveyBuilderProps } from '../components/SurveyBuilder'
import { SurveyBuilder } from '../components/SurveyBuilder'
import type { SatisfactionSurvey } from '../types'

// ── Mock UI components ────────────────────────────────────────────

vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="modal">{children}</div> : null,
  ModalHeader: ({ title, onClose }: { title: string; onClose: () => void }) => (
    <div data-testid="modal-header">
      <h2>{title}</h2>
      <button onClick={onClose} data-testid="close-btn">
        Close
      </button>
    </div>
  ),
  ModalBody: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="modal-body">{children}</div>
  ),
  ModalFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="modal-footer">{children}</div>
  ),
}))

vi.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    ...rest
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
    variant?: string
    [key: string]: unknown
  }) => (
    <button onClick={onClick} disabled={disabled} data-variant={variant} {...rest}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/Input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

vi.mock('@/components/ui/Select', () => ({
  Select: ({
    value,
    onChange,
    options,
    ...rest
  }: {
    value: string
    onChange: (e: { target: { value: string } }) => void
    options: Array<{ value: string; label: string }>
    [key: string]: unknown
  }) => (
    <select value={value} onChange={onChange} {...rest}>
      {options?.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}))

vi.mock('@/components/ui/Spinner', () => ({
  Spinner: () => <span data-testid="spinner" />,
}))

// ── Helpers ───────────────────────────────────────────────────────

const defaultProps: SurveyBuilderProps = {
  open: true,
  onClose: vi.fn(),
  onSave: vi.fn().mockResolvedValue(undefined),
  onPublish: vi.fn().mockResolvedValue(undefined),
  isSaving: false,
}

// ── Tests ─────────────────────────────────────────────────────────

describe('SurveyBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render when closed', () => {
    const { queryByTestId } = render(<SurveyBuilder {...defaultProps} open={false} />)
    expect(queryByTestId('modal')).toBeNull()
  })

  it('renders create mode with empty title', () => {
    const { getByText, getByPlaceholderText } = render(<SurveyBuilder {...defaultProps} />)

    expect(getByText('Buat Survey Baru')).toBeTruthy()
    const titleInput = getByPlaceholderText(/Contoh: Survey Kepuasan/)
    expect((titleInput as HTMLInputElement).value).toBe('')
  })

  it('renders edit mode with pre-filled data', () => {
    const survey: SatisfactionSurvey = {
      id: 's1',
      tenant_id: 'tenant-1',
      title: 'Existing Survey',
      target_audience: 'teachers',
      status: 'draft',
      questions: [{ id: 'q1', type: 'rating', text: 'How good?', required: true }],
      start_date: '2026-01-01',
      end_date: '2026-01-31',
      created_by: null,
      created_at: '2026-01-01T00:00:00Z',
    }

    const { getByText, getByDisplayValue } = render(
      <SurveyBuilder {...defaultProps} survey={survey} />
    )

    expect(getByText('Edit Survey')).toBeTruthy()
    expect(getByDisplayValue('Existing Survey')).toBeTruthy()
    expect(getByDisplayValue('How good?')).toBeTruthy()
  })

  it('loads template questions when clicking template button', () => {
    const { getByText, container } = render(<SurveyBuilder {...defaultProps} />)

    // Template button should be visible when no questions
    const templateBtn = getByText(/Gunakan Template Default/)
    fireEvent.click(templateBtn)

    // After loading template, there should be 5 default questions
    const questionInputs = container.querySelectorAll('input[placeholder^="Pertanyaan"]')
    expect(questionInputs.length).toBe(5)
  })

  it('adds a new rating question', () => {
    const { getByText, container } = render(<SurveyBuilder {...defaultProps} />)

    // Click "+ Rating 1–5" button
    const addRatingBtn = getByText(/\+ Rating 1–5/)
    fireEvent.click(addRatingBtn)

    const questionInputs = container.querySelectorAll('input[placeholder^="Pertanyaan"]')
    expect(questionInputs.length).toBe(1)
  })

  it('adds a new yes/no question', () => {
    const { getByText, container } = render(<SurveyBuilder {...defaultProps} />)

    const addYesNoBtn = getByText(/\+ Ya \/ Tidak/)
    fireEvent.click(addYesNoBtn)

    const questionInputs = container.querySelectorAll('input[placeholder^="Pertanyaan"]')
    expect(questionInputs.length).toBe(1)
  })

  it('adds a new text question', () => {
    const { getByText, container } = render(<SurveyBuilder {...defaultProps} />)

    const addTextBtn = getByText(/\+ Teks Bebas/)
    fireEvent.click(addTextBtn)

    const questionInputs = container.querySelectorAll('input[placeholder^="Pertanyaan"]')
    expect(questionInputs.length).toBe(1)
  })

  it('removes a question when clicking remove button', () => {
    const survey: SatisfactionSurvey = {
      id: 's1',
      tenant_id: 'tenant-1',
      title: 'Test Survey',
      target_audience: 'all',
      status: 'draft',
      questions: [
        { id: 'q1', type: 'rating', text: 'Question 1', required: true },
        { id: 'q2', type: 'text', text: 'Question 2', required: false },
      ],
      start_date: null,
      end_date: null,
      created_by: null,
      created_at: '2026-01-01T00:00:00Z',
    }

    const { getAllByTitle, container } = render(<SurveyBuilder {...defaultProps} survey={survey} />)

    // Should have 2 questions
    let questionInputs = container.querySelectorAll('input[placeholder^="Pertanyaan"]')
    expect(questionInputs.length).toBe(2)

    // Click remove on first question
    const removeButtons = getAllByTitle('Hapus pertanyaan')
    fireEvent.click(removeButtons[0])

    // Should have 1 question now
    questionInputs = container.querySelectorAll('input[placeholder^="Pertanyaan"]')
    expect(questionInputs.length).toBe(1)
  })

  it('changes question type via select', () => {
    const survey: SatisfactionSurvey = {
      id: 's1',
      tenant_id: 'tenant-1',
      title: 'Test Survey',
      target_audience: 'all',
      status: 'draft',
      questions: [{ id: 'q1', type: 'rating', text: 'Rate us', required: true }],
      start_date: null,
      end_date: null,
      created_by: null,
      created_at: '2026-01-01T00:00:00Z',
    }

    const { container } = render(<SurveyBuilder {...defaultProps} survey={survey} />)

    // Find the select element for question type
    const selects = container.querySelectorAll('select')
    // First select in question row is question type (second is audience)
    const questionTypeSelect = selects[1] // audience is first, question type is inside the question row
    expect(questionTypeSelect).toBeDefined()

    // Change from 'rating' to 'text'
    fireEvent.change(questionTypeSelect, { target: { value: 'text' } })

    // After change, the select should have text value
    expect((questionTypeSelect as HTMLSelectElement).value).toBe('text')
  })

  it('shows validation errors when saving without required fields', async () => {
    const onSave = vi.fn()
    const { getByText } = render(<SurveyBuilder {...defaultProps} onSave={onSave} />)

    // Try to save draft without title or questions
    const saveDraftBtn = getByText('Simpan Draft')
    fireEvent.click(saveDraftBtn)

    // Should show validation errors
    expect(getByText('Judul survey wajib diisi.')).toBeTruthy()
    expect(getByText('Tambahkan minimal 1 pertanyaan.')).toBeTruthy()

    // onSave should NOT have been called
    expect(onSave).not.toHaveBeenCalled()
  })

  it('calls onSave when saving draft with valid data', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    const survey: SatisfactionSurvey = {
      id: 's1',
      tenant_id: 'tenant-1',
      title: 'Valid Survey',
      target_audience: 'all',
      status: 'draft',
      questions: [{ id: 'q1', type: 'rating', text: 'Rate us', required: true }],
      start_date: null,
      end_date: null,
      created_by: null,
      created_at: '2026-01-01T00:00:00Z',
    }

    const { getByText } = render(
      <SurveyBuilder {...defaultProps} survey={survey} onSave={onSave} onClose={onClose} />
    )

    const saveDraftBtn = getByText('Simpan Draft')
    fireEvent.click(saveDraftBtn)

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Valid Survey',
        target_audience: 'all',
        questions: expect.arrayContaining([expect.objectContaining({ text: 'Rate us' })]),
      })
    )
  })

  it('calls onPublish when publishing with valid data', async () => {
    const onPublish = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    const survey: SatisfactionSurvey = {
      id: 's1',
      tenant_id: 'tenant-1',
      title: 'Publish Survey',
      target_audience: 'teachers',
      status: 'draft',
      questions: [{ id: 'q1', type: 'rating', text: 'Rate us', required: true }],
      start_date: null,
      end_date: null,
      created_by: null,
      created_at: '2026-01-01T00:00:00Z',
    }

    const { getByText } = render(
      <SurveyBuilder {...defaultProps} survey={survey} onPublish={onPublish} onClose={onClose} />
    )

    const publishBtn = getByText('Publikasikan')
    fireEvent.click(publishBtn)

    expect(onPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Publish Survey',
        target_audience: 'teachers',
      })
    )
  })

  it('disables buttons when isSaving is true', () => {
    const survey: SatisfactionSurvey = {
      id: 's1',
      tenant_id: 'tenant-1',
      title: 'Test',
      target_audience: 'all',
      status: 'draft',
      questions: [{ id: 'q1', type: 'rating', text: 'Q', required: true }],
      start_date: null,
      end_date: null,
      created_by: null,
      created_at: '2026-01-01T00:00:00Z',
    }

    const { getByText } = render(
      <SurveyBuilder {...defaultProps} survey={survey} isSaving={true} />
    )

    const cancelBtn = getByText('Batal')
    const saveDraftBtn = getByText('Simpan Draft')
    const publishBtn = getByText('Publikasikan')

    expect((cancelBtn as HTMLButtonElement).disabled).toBe(true)
    expect((saveDraftBtn as HTMLButtonElement).disabled).toBe(true)
    expect((publishBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows preview section when questions are added', () => {
    const survey: SatisfactionSurvey = {
      id: 's1',
      tenant_id: 'tenant-1',
      title: 'Preview Survey',
      target_audience: 'students',
      status: 'draft',
      questions: [{ id: 'q1', type: 'rating', text: 'Rate', required: true }],
      start_date: null,
      end_date: null,
      created_by: null,
      created_at: '2026-01-01T00:00:00Z',
    }

    const { getByText, container } = render(<SurveyBuilder {...defaultProps} survey={survey} />)

    expect(getByText(/Preview:/)).toBeTruthy()
    expect(getByText(/Preview Survey/)).toBeTruthy()
    const pertanyaanElements = container.querySelectorAll(':scope *')
    const hasOnePertanyaan = Array.from(pertanyaanElements).some(
      (el) => el.textContent?.includes('1 pertanyaan') || el.textContent?.includes('1\n pertanyaan')
    )
    expect(hasOnePertanyaan).toBe(true)
  })
})
