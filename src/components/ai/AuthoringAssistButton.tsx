import { Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { aiProvider } from '@/services/ai/aiProvider'
import { db } from '@/services/db'
import { useToast } from '@/hooks/useToast'

interface AuthoringAssistButtonProps {
  targetType: 'course' | 'lesson' | 'quiz' | 'assignment'
  targetId: string
  /** What you want suggested. Inserted into the prompt as the user-instruction. */
  prompt: string
  /** Friendly label shown on the button. */
  label?: string
  /** Called with the AI suggestion when accepted. */
  onAccept: (suggestion: string) => void
}

/**
 * Reusable inline AI button (Fase 6 Unit 41 — AuthoringAssist). Embed in any
 * authoring surface (Course Builder lesson editor, Quiz Manager question
 * editor, Assignment composer). Logs every draft into authoring_assist_drafts
 * for audit + accept-rate analysis.
 */
export function AuthoringAssistButton({
  targetType,
  targetId,
  prompt,
  label = 'Bantu AI',
  onAccept,
}: AuthoringAssistButtonProps) {
  const { tenantId, user } = useAuth()
  const { addToast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [response, setResponse] = useState('')
  const [draftId, setDraftId] = useState<string | null>(null)

  async function handleGenerate() {
    setIsLoading(true)
    try {
      const result = await aiProvider.complete({
        provider: 'groq',
        messages: [
          {
            role: 'system',
            content:
              'Anda asisten guru yang membantu menulis konten pembelajaran dalam Bahasa Indonesia. Tulis singkat, jelas, sesuai usia siswa SMA. Jangan tambah komentar di luar konten yang diminta.',
          },
          { role: 'user', content: prompt },
        ],
        maxTokens: 600,
        temperature: 0.7,
        metadata: { target_type: targetType, target_id: targetId },
      })
      setResponse(result.content)
      setIsOpen(true)

      // Log draft (best-effort).
      if (tenantId) {
        const { data, error } = await db
          .from('authoring_assist_drafts')
          .insert({
            tenant_id: tenantId,
            author_id: user?.id ?? null,
            target_type: targetType,
            target_id: targetId,
            prompt,
            response: result.content,
            provider: result.provider,
            model: result.model,
            tokens_input: result.tokensInput,
            tokens_output: result.tokensOutput,
          })
          .select('id')
          .single()
        if (!error && data) setDraftId((data as { id: string }).id)
      }
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Bantuan AI gagal',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAccept() {
    onAccept(response)
    setIsOpen(false)
    if (draftId) {
      await db.from('authoring_assist_drafts').update({ accepted: true }).eq('id', draftId)
    }
    addToast({ type: 'success', message: 'Saran diterapkan' })
  }

  async function handleReject() {
    setIsOpen(false)
    if (draftId) {
      await db.from('authoring_assist_drafts').update({ accepted: false }).eq('id', draftId)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleGenerate}
        disabled={isLoading}
        icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
      >
        {isLoading ? 'Memproses...' : label}
      </Button>

      <Modal open={isOpen} onClose={handleReject}>
        <ModalHeader title="Saran AI" onClose={handleReject} />
        <ModalBody>
          <p className="text-xs text-slate-500 mb-2">Prompt: {prompt}</p>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4 text-sm whitespace-pre-wrap">
            {response}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={handleReject}>
            Tolak
          </Button>
          <Button variant="primary" onClick={handleAccept}>
            Terapkan
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
