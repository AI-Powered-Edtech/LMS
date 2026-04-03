import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { checkA11y } from '@/testing/a11y-utils'

import { RecommendationFeed } from '../RecommendationFeed'

vi.mock('../../queries/recommendationQueries', () => ({
  useRecommendations: vi.fn(),
  useRecordRecommendationAction: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

const mockRecommendations = [
  {
    id: 'rec-1',
    tenant_id: 'tenant-1',
    user_id: 'user-1',
    course_id: 'course-1',
    recommendation_type: 'next_lesson' as const,
    reason: 'Lanjutkan materi Matematika Bab 3',
    confidence: 0.85,
    priority: 1,
    status: 'pending' as const,
    created_at: '2026-04-01T00:00:00Z',
  },
  {
    id: 'rec-2',
    tenant_id: 'tenant-1',
    user_id: 'user-1',
    recommendation_type: 'review_quiz' as const,
    reason: 'Review kuis Fisika yang belum tuntas',
    confidence: 0.65,
    priority: 2,
    status: 'pending' as const,
    created_at: '2026-04-01T00:00:00Z',
  },
]

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('RecommendationFeed a11y', () => {
  it('has no accessibility violations', async () => {
    const { useRecommendations } = await import('../../queries/recommendationQueries')
    const { useRecordRecommendationAction } = await import('../../queries/recommendationQueries')
    vi.mocked(useRecommendations).mockReturnValue({
      data: mockRecommendations,
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useRecommendations>)
    vi.mocked(useRecordRecommendationAction).mockReturnValue({
      mutate: vi.fn(),
    } as ReturnType<typeof useRecordRecommendationAction>)

    const { container } = renderWithQueryClient(<RecommendationFeed userId="user-1" />)

    const articles = screen.getAllByRole('article')
    expect(articles.length).toBeGreaterThan(0)

    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-label')
    })

    const decorativeElements = container.querySelectorAll('[aria-hidden="true"]')
    expect(decorativeElements.length).toBeGreaterThan(0)

    await checkA11y(container)
  })
})
