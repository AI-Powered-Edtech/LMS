import { Sparkles } from 'lucide-react'
import { useState } from 'react'

import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'

import { aiRubricService } from '../api/aiRubricService'
import type { RubricInsert } from '../types'

interface AIRubricSuggestionProps {
  assignmentTitle: string
  description: string
  instructions: string
  onSuggested: (rubric: RubricInsert) => void
}

export function AIRubricSuggestion({
  assignmentTitle,
  description,
  instructions,
  onSuggested,
}: AIRubricSuggestionProps) {
  const [isLoading, setIsLoading] = useState(false)
  const addToast = useToast((s) => s.addToast)

  async function handleGenerate() {
    setIsLoading(true)
    try {
      const rubric = await aiRubricService.suggestRubric(assignmentTitle, description, instructions)
      onSuggested(rubric)
      addToast({
        type: 'success',
        message: 'Saran rubrik AI berhasil dibuat. Tinjau dan sesuaikan sebelum menyimpan.',
      })
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal membuat saran rubrik',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={isLoading}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
        'bg-violet-50 text-violet-700 hover:bg-violet-100',
        'dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2'
      )}
    >
      {isLoading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        <Sparkles className="h-4 w-4" aria-hidden="true" />
      )}
      {isLoading ? 'Membuat saran...' : '✨ Buat dengan AI'}
    </button>
  )
}
