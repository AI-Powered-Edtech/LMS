import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SurveyResults, type SurveyResultsProps } from '../components/SurveyResults'
import type { SatisfactionSurvey } from '../types'

// ── Mock UI components ────────────────────────────────────────────

vi.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
}))

vi.mock('@/components/ui/Button', () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    ...rest
  }: {
    children: React.ReactNode
    onClick?: () => void
    variant?: string
    size?: string
    [key: string]: unknown
  }) => (
    <button onClick={onClick} data-variant={variant} data-size={size} {...rest}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/Spinner', () => ({
  Spinner: ({ size }: { size?: string }) => <span data-testid={`spinner-${size || 'default'}`} />,
}))

vi.mock('recharts', () => ({
  Cell: () => null,
  Pie: () => null,
  PieChart: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Tooltip: () => null,
}))

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}))

// ── Mock hooks ────────────────────────────────────────────────────

vi.mock('../hooks/useExecutiveData', () => ({
  useSurveyResults: vi.fn(),
}))

// ── Helpers ───────────────────────────────────────────────────────

const mockUseSurveyResults = vi.mocked(await import('../hooks/useExecutiveData')).useSurveyResults

const defaultSurvey: SatisfactionSurvey = {
  id: 's1',
  tenant_id: 'tenant-1',
  title: 'Test Survey',
  target_audience: 'all',
  status: 'active',
  questions: [
    { id: 'q1', type: 'rating', text: 'Rate us', required: true },
    { id: 'q2', type: 'yesno', text: 'Are you satisfied?', required: true },
    { id: 'q3', type: 'text', text: 'Comments', required: false },
  ],
  start_date: '2026-01-01',
  end_date: '2026-01-31',
  created_by: 'user1',
  created_at: '2026-01-01T00:00:00Z',
}

const defaultProps: SurveyResultsProps = {
  survey: defaultSurvey,
  onClose: vi.fn(),
}

// ── Tests ─────────────────────────────────────────────────────────

describe('SurveyResults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading spinner when loading', () => {
    mockUseSurveyResults.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as any)

    const { getByTestId } = render(<SurveyResults {...defaultProps} />)
    expect(getByTestId('spinner-lg')).toBeTruthy()
  })

  it('shows error message when there is an error', () => {
    mockUseSurveyResults.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Test error'),
    } as any)

    const { getByText } = render(<SurveyResults {...defaultProps} />)
    expect(getByText('Gagal memuat hasil survey. Silakan coba lagi.')).toBeTruthy()
  })

  it('shows empty responses state when no responses exist', () => {
    mockUseSurveyResults.mockReturnValue({
      data: {
        survey: defaultSurvey,
        totalResponses: 0,
        questionResults: [],
      },
      isLoading: false,
      error: null,
    } as any)

    const { getByText } = render(<SurveyResults {...defaultProps} />)
    expect(getByText('Belum Ada Respons')).toBeTruthy()
    expect(getByText(/sudah dipublikasikan dan menunggu respons/)).toBeTruthy()
  })

  it('shows empty responses state for draft survey', () => {
    const draftSurvey = { ...defaultSurvey, status: 'draft' as const }
    mockUseSurveyResults.mockReturnValue({
      data: {
        survey: draftSurvey,
        totalResponses: 0,
        questionResults: [],
      },
      isLoading: false,
      error: null,
    } as any)

    const { getByText } = render(<SurveyResults {...defaultProps} survey={draftSurvey} />)
    expect(getByText('Belum Ada Respons')).toBeTruthy()
    expect(getByText(/belum dipublikasikan/)).toBeTruthy()
  })

  it('displays survey stats correctly', () => {
    mockUseSurveyResults.mockReturnValue({
      data: {
        survey: defaultSurvey,
        totalResponses: 5,
        questionResults: [
          {
            question: defaultSurvey.questions[0],
            ratingAvg: 4.2,
            ratingDistribution: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 2 },
          },
          {
            question: defaultSurvey.questions[1],
            yesCount: 3,
            noCount: 2,
          },
          {
            question: defaultSurvey.questions[2],
            textAnswers: ['Good', 'Excellent'],
          },
        ],
      },
      isLoading: false,
      error: null,
    } as any)

    const { getAllByText } = render(<SurveyResults {...defaultProps} />)
    expect(getAllByText('5').length).toBeGreaterThan(0) // Total responses
    expect(getAllByText('3').length).toBeGreaterThan(0) // Questions count
    expect(getAllByText(/4\.2\/5/).length).toBeGreaterThan(0) // Average rating
  })

  it('displays question results correctly', () => {
    mockUseSurveyResults.mockReturnValue({
      data: {
        survey: defaultSurvey,
        totalResponses: 3,
        questionResults: [
          {
            question: defaultSurvey.questions[0],
            ratingAvg: 4.0,
            ratingDistribution: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 },
          },
          {
            question: defaultSurvey.questions[1],
            yesCount: 2,
            noCount: 1,
          },
          {
            question: defaultSurvey.questions[2],
            textAnswers: ['Great service!', 'Could be better'],
          },
        ],
      },
      isLoading: false,
      error: null,
    } as any)

    const { getByText, getAllByText } = render(<SurveyResults {...defaultProps} />)
    expect(getByText('Hasil per Pertanyaan')).toBeTruthy()
    expect(getByText('Rate us')).toBeTruthy()
    expect(getByText('Are you satisfied?')).toBeTruthy()
    expect(getByText('Comments')).toBeTruthy()

    // Check rating display
    expect(getAllByText(/4\.0/).length).toBeGreaterThan(0)

    // Check yes/no display
    expect(getByText('Ya: 2')).toBeTruthy()
    expect(getByText('Tidak: 1')).toBeTruthy()

    // Check text answers (Word cloud output is lowercase and splits words)
    expect(getByText('great')).toBeTruthy()
    expect(getByText('service')).toBeTruthy()
    expect(getByText('could')).toBeTruthy()
    expect(getByText('better')).toBeTruthy()
  })

  it('shows "Belum ada jawaban" for unanswered questions', () => {
    mockUseSurveyResults.mockReturnValue({
      data: {
        survey: defaultSurvey,
        totalResponses: 1, // Must be > 0 to render questions
        questionResults: [
          {
            question: defaultSurvey.questions[1],
            yesCount: 0,
            noCount: 0,
          },
        ],
      },
      isLoading: false,
      error: null,
    } as any)

    const { getByText } = render(<SurveyResults {...defaultProps} />)
    expect(getByText('Belum ada jawaban.')).toBeTruthy()
  })

  it('exports CSV when export button is clicked', () => {
    // Mock URL and document methods
    const mockCreateObjectURL = vi.fn(() => 'blob:url')
    const mockRevokeObjectURL = vi.fn()
    const mockClick = vi.fn()

    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      },
      writable: true,
    })

    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(
      (tagName: string, options?: ElementCreationOptions | string) => {
        if (tagName === 'a') {
          return {
            href: '',
            download: '',
            click: mockClick,
            style: { display: '' },
            setAttribute: vi.fn(),
          } as any
        }
        return originalCreateElement(tagName, options as ElementCreationOptions)
      }
    )

    mockUseSurveyResults.mockReturnValue({
      data: {
        survey: defaultSurvey,
        totalResponses: 2,
        questionResults: [
          {
            question: defaultSurvey.questions[0],
            ratingAvg: 4.5,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 },
          },
        ],
      },
      isLoading: false,
      error: null,
    } as any)

    const { getByText } = render(<SurveyResults {...defaultProps} />)
    const exportBtn = getByText('📥 Export CSV')
    exportBtn.click()

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:url')
  })
})
