import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { checkA11y } from '@/testing/a11y-utils'

import { NotificationPreferencesPanel } from '../NotificationPreferencesPanel'

vi.mock('../hooks/useNotificationPreferences', () => ({
  PREF_TYPE_LABELS: {
    assignment_due: 'Batas Waktu Tugas',
    quiz_result: 'Hasil Kuis',
    grade_posted: 'Nilai Diposting',
    message_received: 'Pesan Masuk',
    announcement: 'Pengumuman Sekolah',
    system_alert: 'Peringatan Sistem',
  },
  useNotificationPreferencesLocal: () => ({
    preferences: {
      assignment_due: { inApp: true, email: true, push: true },
      quiz_result: { inApp: true, email: false, push: true },
      grade_posted: { inApp: true, email: true, push: true },
      message_received: { inApp: true, email: false, push: true },
      announcement: { inApp: true, email: false, push: false },
      system_alert: { inApp: true, email: true, push: true },
    },
    updatePreference: vi.fn(),
    resetToDefaults: vi.fn(),
  }),
}))

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('NotificationPreferencesPanel a11y', () => {
  it('has no accessibility violations', async () => {
    const { container } = renderWithQueryClient(<NotificationPreferencesPanel />)

    const switches = screen.getAllByRole('switch')
    expect(switches.length).toBeGreaterThan(0)
    switches.forEach((sw) => {
      expect(sw).toHaveAttribute('aria-checked')
    })

    const grid = screen.getByRole('grid')
    expect(grid).toBeInTheDocument()

    const liveRegion = container.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()

    await checkA11y(container)
  })
})
