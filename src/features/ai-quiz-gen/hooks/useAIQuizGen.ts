import { useState } from 'react'
import { aiQuizGenService } from '../api/aiQuizGenService'
import type { GenerateQuizConfig, GenerateQuizResult } from '../types'

export function useAIQuizGen() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<GenerateQuizResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generate = async (config: GenerateQuizConfig) => {
    setIsGenerating(true)
    setError(null)
    setResult(null)
    try {
      const data = await aiQuizGenService.generateQuestions(config)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui')
    } finally {
      setIsGenerating(false)
    }
  }

  const reset = () => {
    setResult(null)
    setError(null)
  }

  return { generate, isGenerating, result, error, reset }
}
