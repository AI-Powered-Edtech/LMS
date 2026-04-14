import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TrafficLightCard } from '../components/TrafficLightCard'

describe('TrafficLightCard', () => {
  // ── Status GREEN ──────────────────────────────────────────────

  it('menampilkan "SEMUA BAIK" untuk status green', () => {
    const { getByText } = render(
      <TrafficLightCard status="green" reason="Rata-rata nilai 85" childName="Andi" />
    )

    expect(getByText('SEMUA BAIK')).toBeTruthy()
    expect(getByText('Rata-rata nilai 85')).toBeTruthy()
  })

  // ── Status YELLOW ─────────────────────────────────────────────

  it('menampilkan "PERLU PERHATIAN" untuk status yellow', () => {
    const { getByText } = render(
      <TrafficLightCard status="yellow" reason="1 tugas belum dikumpulkan" childName="Budi" />
    )

    expect(getByText('PERLU PERHATIAN')).toBeTruthy()
    expect(getByText('1 tugas belum dikumpulkan')).toBeTruthy()
  })

  // ── Status RED ────────────────────────────────────────────────

  it('menampilkan "BUTUH TINDAKAN" untuk status red', () => {
    const { getByText } = render(
      <TrafficLightCard status="red" reason="3 tugas terlambat dikumpulkan" childName="Citra" />
    )

    expect(getByText('BUTUH TINDAKAN')).toBeTruthy()
    expect(getByText('3 tugas terlambat dikumpulkan')).toBeTruthy()
  })

  // ── Child Name ────────────────────────────────────────────────

  it('menampilkan nama anak pada label status', () => {
    const { getByText } = render(
      <TrafficLightCard status="green" reason="Semua baik" childName="Dewi" />
    )

    expect(getByText('Status Dewi')).toBeTruthy()
  })

  // ── Accessibility ─────────────────────────────────────────────

  it('memiliki role="status" dengan aria-label yang tepat', () => {
    const { container } = render(<TrafficLightCard status="green" reason="Baik" childName="Andi" />)

    const statusEl = container.querySelector('[role="status"]')
    expect(statusEl).toBeTruthy()
    expect(statusEl?.getAttribute('aria-label')).toBe('Status Andi: SEMUA BAIK')
  })

  it('aria-label yang tepat untuk status yellow', () => {
    const { container } = render(
      <TrafficLightCard status="yellow" reason="Perlu perhatian" childName="Budi" />
    )

    const statusEl = container.querySelector('[role="status"]')
    expect(statusEl?.getAttribute('aria-label')).toBe('Status Budi: PERLU PERHATIAN')
  })

  it('aria-label yang tepat untuk status red', () => {
    const { container } = render(
      <TrafficLightCard status="red" reason="Butuh tindakan" childName="Citra" />
    )

    const statusEl = container.querySelector('[role="status"]')
    expect(statusEl?.getAttribute('aria-label')).toBe('Status Citra: BUTUH TINDAKAN')
  })

  // ── Emoji ─────────────────────────────────────────────────────

  it('menampilkan emoji yang sesuai dengan status', () => {
    const { container: greenC } = render(
      <TrafficLightCard status="green" reason="" childName="A" />
    )
    const { container: yellowC } = render(
      <TrafficLightCard status="yellow" reason="" childName="A" />
    )
    const { container: redC } = render(<TrafficLightCard status="red" reason="" childName="A" />)

    expect(greenC.textContent).toContain('\uD83D\uDFE2') // 🟢
    expect(yellowC.textContent).toContain('\uD83D\uDFE1') // 🟡
    expect(redC.textContent).toContain('\uD83D\uDD34') // 🔴
  })

  // ── Dark Mode Classes ─────────────────────────────────────────

  it('mengandung dark mode classes pada container', () => {
    const { container } = render(<TrafficLightCard status="green" reason="" childName="A" />)

    const statusEl = container.querySelector('[role="status"]')
    expect(statusEl?.className).toContain('dark:')
  })
})
