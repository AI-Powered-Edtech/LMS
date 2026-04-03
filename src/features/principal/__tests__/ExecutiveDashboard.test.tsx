import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// ── Mock dependencies ─────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    profile: { first_name: 'Budi', last_name: 'Santoso' },
    activeTenant: { name: 'SMA Nusantara' },
    tenantId: 'tenant-1',
  }),
}))

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: vi.fn().mockReturnValue({ resolvedTheme: 'light' }),
}))

// Mock Recharts to avoid SSR issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
  LineChart: ({ children }: { children: React.ReactNode }) => children,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}))

// Mock sub-components
vi.mock('../components/ReportGenerator', () => ({
  ReportGenerator: () => null,
}))
vi.mock('../components/ReportScheduler', () => ({
  ReportScheduler: () => null,
}))

// ── Mock hook return values ───────────────────────────────────────

const mockUseExecutiveData = vi.fn()
const mockUseSurveys = vi.fn()

vi.mock('../hooks/useExecutiveData', () => ({
  useExecutiveData: () => mockUseExecutiveData(),
  useSurveys: () => mockUseSurveys(),
}))

import { ExecutiveDashboard } from '../components/ExecutiveDashboard'

// ── Fixtures ──────────────────────────────────────────────────────

const defaultOverview = {
  total_students: 150,
  active_students: 120,
  total_teachers: 20,
  active_teachers: 15,
  total_courses: 8,
  avg_quiz_score: 75,
  adoption_rate: 80,
}

const defaultROI = {
  paper_saved_sheets: 2000,
  paper_saved_cost: 1000000,
  teacher_time_saved_hours: 5.5,
  digital_adoption_score: 78,
}

const defaultTrend = [
  { month: 'Jan', active_students: 100, lesson_completions: 500, quiz_attempts: 200 },
]

const defaultSettings = {
  tenant_id: 'tenant-1',
  school_name: 'SMA Nusantara',
  academic_year: '2025/2026',
}

const loadingState = {
  overview: undefined,
  monthlyTrend: [],
  roiMetrics: undefined,
  settings: undefined,
  isLoading: true,
  error: null,
  refetchAll: vi.fn(),
}

const dataState = {
  overview: defaultOverview,
  monthlyTrend: defaultTrend,
  roiMetrics: defaultROI,
  settings: defaultSettings,
  isLoading: false,
  error: null,
  refetchAll: vi.fn(),
}

const emptyState = {
  overview: {
    total_students: 0,
    active_students: 0,
    total_teachers: 0,
    active_teachers: 0,
    total_courses: 0,
    avg_quiz_score: 0,
    adoption_rate: 0,
  },
  monthlyTrend: [],
  roiMetrics: undefined,
  settings: undefined,
  isLoading: false,
  error: null,
  refetchAll: vi.fn(),
}

const defaultSurveyState = {
  surveys: [],
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  createSurvey: vi.fn(),
  isCreating: false,
  updateSurvey: vi.fn(),
  isUpdating: false,
  publishSurvey: vi.fn(),
  isPublishing: false,
  closeSurvey: vi.fn(),
  isClosing: false,
  deleteSurvey: vi.fn(),
  isDeleting: false,
}

// ── Tests ─────────────────────────────────────────────────────────

describe('ExecutiveDashboard', () => {
  it('renders loading state with skeleton cards', () => {
    mockUseExecutiveData.mockReturnValue(loadingState)
    mockUseSurveys.mockReturnValue(defaultSurveyState)

    const { container } = render(<ExecutiveDashboard />)

    // Skeleton cards should be rendered (SkeletonCard renders with animate-pulse)
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders metric cards with correct values when data is loaded', () => {
    mockUseExecutiveData.mockReturnValue(dataState)
    mockUseSurveys.mockReturnValue(defaultSurveyState)

    const { getByText, getAllByText } = render(<ExecutiveDashboard />)

    // Check header
    expect(getByText('Dashboard Eksekutif')).toBeTruthy()
    expect(getByText(/SMA Nusantara/)).toBeTruthy()

    // Check metric labels (some labels appear in multiple sections, use getAllByText)
    expect(getAllByText('Siswa Aktif').length).toBeGreaterThan(0)
    expect(getAllByText('Guru Aktif').length).toBeGreaterThan(0)
    expect(getByText('Kursus Aktif')).toBeTruthy()
    expect(getAllByText('Rata-rata Nilai').length).toBeGreaterThan(0)

    // Check metric values (formatted with id-ID locale)
    expect(getByText('120')).toBeTruthy() // active_students
    expect(getByText('15')).toBeTruthy() // active_teachers
    expect(getByText('8')).toBeTruthy() // total_courses
    expect(getAllByText('75/100').length).toBeGreaterThan(0) // avg_quiz_score (appears in metric card + academic card)
  })

  it('renders empty state when no data exists', () => {
    mockUseExecutiveData.mockReturnValue(emptyState)
    mockUseSurveys.mockReturnValue(defaultSurveyState)

    const { getByText } = render(<ExecutiveDashboard />)

    expect(getByText('Belum Ada Data')).toBeTruthy()
    expect(getByText(/Data akan muncul setelah guru dan siswa mulai menggunakan/)).toBeTruthy()
  })

  it('renders quick action buttons', () => {
    mockUseExecutiveData.mockReturnValue(dataState)
    mockUseSurveys.mockReturnValue(defaultSurveyState)

    const { getByText } = render(<ExecutiveDashboard />)

    expect(getByText('Tindakan Cepat')).toBeTruthy()
    expect(getByText('Unduh Laporan Bulanan')).toBeTruthy()
    expect(getByText('Export untuk Yayasan')).toBeTruthy()
    expect(getByText('Pengaturan Dashboard')).toBeTruthy()
    expect(getByText('Jadwalkan Laporan')).toBeTruthy()
  })

  it('renders feature shortcut cards', () => {
    mockUseExecutiveData.mockReturnValue(dataState)
    mockUseSurveys.mockReturnValue(defaultSurveyState)

    const { getAllByText } = render(<ExecutiveDashboard />)

    expect(getAllByText(/Lihat Analitik Sebelum/).length).toBeGreaterThan(0)
    expect(getAllByText(/Kelola Survey Kepuasan/).length).toBeGreaterThan(0)
  })

  it('renders welcome badge with user name', () => {
    mockUseExecutiveData.mockReturnValue(dataState)
    mockUseSurveys.mockReturnValue(defaultSurveyState)

    const { getByText } = render(<ExecutiveDashboard />)

    expect(getByText('Selamat datang, Budi Santoso')).toBeTruthy()
  })

  it('shows ROI card with correct values', () => {
    mockUseExecutiveData.mockReturnValue(dataState)
    mockUseSurveys.mockReturnValue(defaultSurveyState)

    const { getByText } = render(<ExecutiveDashboard />)

    expect(getByText('Estimasi Penghematan')).toBeTruthy()
    expect(getByText(/lembar dihemat/)).toBeTruthy()
    expect(getByText(/jam\/minggu lebih efisien/)).toBeTruthy()
    expect(getByText('Skor Adopsi Digital')).toBeTruthy()
  })

  it('shows academic overview card', () => {
    mockUseExecutiveData.mockReturnValue(dataState)
    mockUseSurveys.mockReturnValue(defaultSurveyState)

    const { getByText, getAllByText } = render(<ExecutiveDashboard />)

    expect(getByText('Ikhtisar Akademik')).toBeTruthy()
    expect(getAllByText('Rata-rata Nilai').length).toBeGreaterThan(0)
    expect(getByText('Tingkat Kelulusan Proyeksi')).toBeTruthy()
  })

  it('shows active survey count badge when surveys are active', () => {
    mockUseExecutiveData.mockReturnValue(dataState)
    mockUseSurveys.mockReturnValue({
      ...defaultSurveyState,
      surveys: [
        { id: 's1', title: 'Survey 1', status: 'active' },
        { id: 's2', title: 'Survey 2', status: 'active' },
        { id: 's3', title: 'Survey 3', status: 'draft' },
      ],
    })

    const { getByText } = render(<ExecutiveDashboard />)

    expect(getByText('2 Aktif')).toBeTruthy()
    expect(getByText(/2 survey aktif/)).toBeTruthy()
  })

  it('shows trend chart section heading', () => {
    mockUseExecutiveData.mockReturnValue(dataState)
    mockUseSurveys.mockReturnValue(defaultSurveyState)

    const { getByText } = render(<ExecutiveDashboard />)

    expect(getByText('Tren Aktivitas 6 Bulan')).toBeTruthy()
  })
})
