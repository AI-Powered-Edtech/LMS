import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { aiProvider } from '@/services/ai/aiProvider'
import { db } from '@/services/db'
import { useToast } from '@/hooks/useToast'

interface SpeedGraderAiScoreProps {
  submissionId: string
  submissionText: string
  rubric?: Array<{ criterion: string; maxScore: number; description?: string }>
  /** Called when teacher accepts the AI score; payload is in {0..100} range. */
  onAccept: (score: number, feedback: string) => void
}

interface AiSuggestion {
  score: number
  feedback: string
  rubricScores?: Record<string, number>
}

/**
 * Inline AI scoring button for SpeedGrader (Fase 6 Unit 42).
 *
 * The teacher remains in the loop: the AI suggests a score + feedback, the
 * teacher reviews and either accepts (writes to gradebook) or overrides.
 * Both decision paths are logged to speedgrader_suggestions.
 */
export function SpeedGraderAiScore({
  submissionId,
  submissionText,
  rubric,
  onAccept,
}: SpeedGraderAiScoreProps) {
  const { tenantId } = useAuth()
  const { addToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null)

  async function handleGenerate() {
    setIsLoading(true)
    try {
      const rubricBlock = rubric
        ? '\nRubrik penilaian:\n' +
          rubric
            .map(
              (r) =>
                `- ${r.criterion} (max ${r.maxScore}): ${r.description ?? ''}`,
            )
            .join('\n')
        : ''

      const result = await aiProvider.complete({
        provider: 'anthropic',
        messages: [
          {
            role: 'system',
            content:
              'Anda asisten guru yang menilai tugas siswa SMA. Berikan: (1) skor 0-100 sebagai angka di baris pertama dengan format "SKOR: <angka>", (2) umpan balik 2-3 kalimat dalam Bahasa Indonesia formal, fokus pada kekuatan dan area perbaikan. Jangan tambah komentar di luar format ini.',
          },
          {
            role: 'user',
            content: `Tugas siswa:\n${submissionText.slice(0, 4000)}${rubricBlock}\n\nNilai dan beri umpan balik:`,
          },
        ],
        maxTokens: 400,
        temperature: 0.3,
      })

      // Parse "SKOR: <n>" from the first line.
      const scoreMatch = result.content.match(/SKOR:\s*(\d+(?:\.\d+)?)/i)
      const score = scoreMatch ? Number.parseFloat(scoreMatch[1]) : 0
      const feedback = result.content.replace(/SKOR:\s*\d+(?:\.\d+)?/i, '').trim()

      const sug: AiSuggestion = { score, feedback }
      setSuggestion(sug)
      setIsOpen(true)

      // Log suggestion.
      if (tenantId) {
        await db.from('speedgrader_suggestions').upsert({
          submission_id: submissionId,
          tenant_id: tenantId,
          rubric_json: rubric ?? null,
          suggested_score: score,
          suggested_feedback: feedback,
          provider: result.provider,
          model: result.model,
          tokens_input: result.tokensInput,
          tokens_output: result.tokensOutput,
        })
      }
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Skor AI gagal dihasilkan',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAccept() {
    if (!suggestion) return
    onAccept(suggestion.score, suggestion.feedback)
    setIsOpen(false)
    if (tenantId) {
      await db
        .from('speedgrader_suggestions')
        .update({
          teacher_accepted: true,
          teacher_score: suggestion.score,
          teacher_feedback: suggestion.feedback,
        })
        .eq('submission_id', submissionId)
    }
    addToast({ type: 'success', message: 'Skor AI diterapkan' })
  }

  async function handleReject() {
    setIsOpen(false)
    if (tenantId) {
      await db
        .from('speedgrader_suggestions')
        .update({ teacher_accepted: false })
        .eq('submission_id', submissionId)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleGenerate}
        disabled={isLoading || !submissionText}
        icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      >
        {isLoading ? 'Menilai...' : 'Skor dengan AI'}
      </Button>

      <Modal open={isOpen} onClose={handleReject}>
        <ModalHeader title="Saran Skor dari AI" onClose={handleReject} />
        <ModalBody>
          {suggestion && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-slate-500 uppercase">Skor yang disarankan</p>
                <p className="text-4xl font-bold text-slate-900 dark:text-white mt-1">
                  {suggestion.score.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase mb-2">Umpan Balik</p>
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3 text-sm whitespace-pre-wrap">
                  {suggestion.feedback}
                </div>
              </div>
              <p className="text-xs text-slate-500 italic">
                Anda tetap berhak menolak atau mengubah skor sebelum dikirim.
              </p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={handleReject}>
            Tolak
          </Button>
          <Button variant="primary" onClick={handleAccept}>
            Terapkan ke Nilai
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
