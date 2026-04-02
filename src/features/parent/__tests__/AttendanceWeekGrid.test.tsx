import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AttendanceWeekGrid } from '../components/AttendanceWeekGrid'
import type { AttendanceDay } from '../types'

// ── Test Data ────────────────────────────────────────────────────────────────

// Gunakan tanggal di masa lalu agar tidak dianggap future day
const PAST_WEEK: AttendanceDay[] = [
  { date: '2025-01-06', status: 'hadir' }, // Senin
  { date: '2025-01-07', status: 'alpha' }, // Selasa
  { date: '2025-01-08', status: 'sakit' }, // Rabu
  { date: '2025-01-09', status: 'izin' }, // Kamis
  { date: '2025-01-10', status: 'hadir' }, // Jumat
]

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AttendanceWeekGrid', () => {
  // ── Render 5 hari ─────────────────────────────────────────────

  it('menampilkan header KEHADIRAN MINGGU INI', () => {
    const { getByText } = render(<AttendanceWeekGrid attendance={PAST_WEEK} />)
    expect(getByText('KEHADIRAN MINGGU INI')).toBeTruthy()
  })

  it('menampilkan 5 grid items', () => {
    const { container } = render(<AttendanceWeekGrid attendance={PAST_WEEK} />)
    const items = container.querySelectorAll('[role="listitem"]')
    expect(items).toHaveLength(5)
  })

  it('menampilkan label hari (Sen, Sel, Rab, Kam, Jum)', () => {
    const { getByText } = render(<AttendanceWeekGrid attendance={PAST_WEEK} />)
    expect(getByText('Sen')).toBeTruthy()
    expect(getByText('Sel')).toBeTruthy()
    expect(getByText('Rab')).toBeTruthy()
    expect(getByText('Kam')).toBeTruthy()
    expect(getByText('Jum')).toBeTruthy()
  })

  // ── Status Icons ──────────────────────────────────────────────

  it('menampilkan emoji \u2705 untuk status hadir', () => {
    const { container } = render(
      <AttendanceWeekGrid attendance={[{ date: '2025-01-06', status: 'hadir' }]} />
    )
    expect(container.textContent).toContain('\u2705') // ✅
  })

  it('menampilkan emoji \u274C untuk status alpha', () => {
    const { container } = render(
      <AttendanceWeekGrid attendance={[{ date: '2025-01-06', status: 'alpha' }]} />
    )
    expect(container.textContent).toContain('\u274C') // ❌
  })

  it('menampilkan emoji \uD83E\uDD12 untuk status sakit', () => {
    const { container } = render(
      <AttendanceWeekGrid attendance={[{ date: '2025-01-06', status: 'sakit' }]} />
    )
    expect(container.textContent).toContain('\uD83E\uDD12') // 🤒
  })

  it('menampilkan emoji \uD83D\uDCDD untuk status izin', () => {
    const { container } = render(
      <AttendanceWeekGrid attendance={[{ date: '2025-01-06', status: 'izin' }]} />
    )
    expect(container.textContent).toContain('\uD83D\uDCDD') // 📝
  })

  // ── Status Labels ─────────────────────────────────────────────

  it('menampilkan label status teks', () => {
    const { getAllByText } = render(<AttendanceWeekGrid attendance={PAST_WEEK} />)
    // "Hadir" muncul beberapa kali (grid + legenda)
    expect(getAllByText('Hadir').length).toBeGreaterThanOrEqual(1)
    expect(getAllByText('Alpha').length).toBeGreaterThanOrEqual(1)
    expect(getAllByText('Sakit').length).toBeGreaterThanOrEqual(1)
    expect(getAllByText('Izin').length).toBeGreaterThanOrEqual(1)
  })

  // ── Aria Labels ───────────────────────────────────────────────

  it('memiliki aria-label yang tepat untuk setiap hari', () => {
    const { container } = render(<AttendanceWeekGrid attendance={PAST_WEEK} />)
    const items = container.querySelectorAll('[role="listitem"]')

    expect(items[0].getAttribute('aria-label')).toBe('Sen: Hadir')
    expect(items[1].getAttribute('aria-label')).toBe('Sel: Alpha')
    expect(items[2].getAttribute('aria-label')).toBe('Rab: Sakit')
    expect(items[3].getAttribute('aria-label')).toBe('Kam: Izin')
    expect(items[4].getAttribute('aria-label')).toBe('Jum: Hadir')
  })

  // ── Empty State ───────────────────────────────────────────────

  it('menampilkan pesan kosong jika tidak ada data kehadiran', () => {
    const { getByText } = render(<AttendanceWeekGrid attendance={[]} />)
    expect(getByText('Data kehadiran belum tersedia.')).toBeTruthy()
  })

  // ── Loading State ─────────────────────────────────────────────

  it('menampilkan skeleton saat loading', () => {
    const { container } = render(<AttendanceWeekGrid attendance={[]} isLoading />)
    const skeletons = container.querySelectorAll('[aria-busy="true"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('tidak menampilkan grid atau empty state saat loading', () => {
    const { queryByText, container } = render(
      <AttendanceWeekGrid attendance={PAST_WEEK} isLoading />
    )
    const items = container.querySelectorAll('[role="listitem"]')
    expect(items).toHaveLength(0)
    expect(queryByText('Data kehadiran belum tersedia.')).toBeNull()
  })

  // ── Legenda ───────────────────────────────────────────────────

  it('menampilkan legenda status', () => {
    const { container } = render(<AttendanceWeekGrid attendance={PAST_WEEK} />)
    // Legenda memiliki 4 status entries
    const legendaTexts = container.textContent
    expect(legendaTexts).toContain('Hadir')
    expect(legendaTexts).toContain('Sakit')
    expect(legendaTexts).toContain('Izin')
    expect(legendaTexts).toContain('Alpha')
  })

  // ── Grid Container ────────────────────────────────────────────

  it('memiliki aria-label pada grid container', () => {
    const { container } = render(<AttendanceWeekGrid attendance={PAST_WEEK} />)
    const grid = container.querySelector('[role="list"]')
    expect(grid?.getAttribute('aria-label')).toBe('Kehadiran minggu ini')
  })

  // ── Max 5 slots ───────────────────────────────────────────────

  it('hanya menampilkan maksimal 5 slot meskipun data lebih banyak', () => {
    const sixDays: AttendanceDay[] = [
      { date: '2025-01-06', status: 'hadir' },
      { date: '2025-01-07', status: 'hadir' },
      { date: '2025-01-08', status: 'hadir' },
      { date: '2025-01-09', status: 'hadir' },
      { date: '2025-01-10', status: 'hadir' },
      { date: '2025-01-11', status: 'hadir' },
    ]
    const { container } = render(<AttendanceWeekGrid attendance={sixDays} />)
    const items = container.querySelectorAll('[role="listitem"]')
    expect(items).toHaveLength(5)
  })
})
