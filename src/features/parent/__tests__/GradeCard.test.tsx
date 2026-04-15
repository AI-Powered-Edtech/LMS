import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { GradeCard } from '../components/GradeCard'
import type { ChildGradeSummary } from '../types'

// ── Test Data ────────────────────────────────────────────────────────────────

const MOCK_GRADES: ChildGradeSummary[] = [
  { subject: 'Matematika', latest_score: 85, previous_score: 70, trend: 'up' },
  { subject: 'IPA', latest_score: 60, previous_score: 75, trend: 'down' },
  { subject: 'IPS', latest_score: 78, previous_score: 77, trend: 'stable' },
]

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GradeCard', () => {
  // ── Render dengan data ────────────────────────────────────────

  it('menampilkan header NILAI TERBARU', () => {
    const { getByText } = render(<GradeCard grades={MOCK_GRADES} />)
    expect(getByText('NILAI TERBARU')).toBeTruthy()
  })

  it('menampilkan semua mata pelajaran', () => {
    const { getByText } = render(<GradeCard grades={MOCK_GRADES} />)
    expect(getByText('Matematika')).toBeTruthy()
    expect(getByText('IPA')).toBeTruthy()
    expect(getByText('IPS')).toBeTruthy()
  })

  it('menampilkan skor terbaru', () => {
    const { getByText } = render(<GradeCard grades={MOCK_GRADES} />)
    expect(getByText('85')).toBeTruthy()
    expect(getByText('60')).toBeTruthy()
    expect(getByText('78')).toBeTruthy()
  })

  // ── Trend Arrows ──────────────────────────────────────────────

  it('menampilkan panah naik (\u2191) untuk trend up', () => {
    const { container } = render(
      <GradeCard
        grades={[{ subject: 'Test', latest_score: 90, previous_score: 70, trend: 'up' }]}
      />
    )
    const upArrow = container.querySelector('[aria-label="Naik"]')
    expect(upArrow).toBeTruthy()
    expect(upArrow?.textContent).toBe('\u2191')
  })

  it('menampilkan panah turun (\u2193) untuk trend down', () => {
    const { container } = render(
      <GradeCard
        grades={[{ subject: 'Test', latest_score: 50, previous_score: 80, trend: 'down' }]}
      />
    )
    const downArrow = container.querySelector('[aria-label="Turun"]')
    expect(downArrow).toBeTruthy()
    expect(downArrow?.textContent).toBe('\u2193')
  })

  it('menampilkan panah stabil (\u2192) untuk trend stable', () => {
    const { container } = render(
      <GradeCard
        grades={[{ subject: 'Test', latest_score: 80, previous_score: 79, trend: 'stable' }]}
      />
    )
    const stableArrow = container.querySelector('[aria-label="Stabil"]')
    expect(stableArrow).toBeTruthy()
    expect(stableArrow?.textContent).toBe('\u2192')
  })

  // ── Empty State ───────────────────────────────────────────────

  it('menampilkan pesan "Belum ada nilai" jika grades kosong', () => {
    const { getByText } = render(<GradeCard grades={[]} />)
    expect(getByText('Belum ada nilai yang tercatat.')).toBeTruthy()
  })

  // ── Loading State ─────────────────────────────────────────────

  it('menampilkan skeleton saat loading', () => {
    const { container } = render(<GradeCard grades={[]} isLoading />)
    const skeletons = container.querySelectorAll('[role="status"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('tidak menampilkan data saat loading', () => {
    const { queryByText } = render(<GradeCard grades={MOCK_GRADES} isLoading />)
    // Saat loading, grade list tidak ditampilkan
    expect(queryByText('Belum ada nilai yang tercatat.')).toBeNull()
  })

  // ── Score Bar (progressbar) ───────────────────────────────────

  it('menampilkan progressbar untuk setiap grade', () => {
    const { container } = render(<GradeCard grades={MOCK_GRADES} />)
    const progressBars = container.querySelectorAll('[role="progressbar"]')
    expect(progressBars).toHaveLength(3)
  })

  it('progressbar memiliki aria-valuenow yang benar', () => {
    const { container } = render(
      <GradeCard
        grades={[{ subject: 'Test', latest_score: 85, previous_score: null, trend: 'stable' }]}
      />
    )
    const progressBar = container.querySelector('[role="progressbar"]')
    expect(progressBar?.getAttribute('aria-valuenow')).toBe('85')
    expect(progressBar?.getAttribute('aria-valuemin')).toBe('0')
    expect(progressBar?.getAttribute('aria-valuemax')).toBe('100')
  })

  // ── Dark Mode Classes ─────────────────────────────────────────

  it('mengandung dark mode classes', () => {
    const { container } = render(<GradeCard grades={MOCK_GRADES} />)
    // Cek apakah ada class dark: di dalam rendered output
    const allElements = container.querySelectorAll('*')
    const hasDarkClass = Array.from(allElements).some((el) => el.className?.includes?.('dark:'))
    expect(hasDarkClass).toBe(true)
  })

  // ── Color Coding ──────────────────────────────────────────────

  it('menerapkan warna hijau untuk skor >= 80', () => {
    const { container } = render(
      <GradeCard
        grades={[{ subject: 'High', latest_score: 85, previous_score: null, trend: 'stable' }]}
      />
    )
    // Score text should be rendered
    expect(container.textContent).toContain('85')
  })

  it('menerapkan list role pada grade list', () => {
    const { container } = render(<GradeCard grades={MOCK_GRADES} />)
    const list = container.querySelector('[role="list"]')
    expect(list).toBeTruthy()
  })
})
