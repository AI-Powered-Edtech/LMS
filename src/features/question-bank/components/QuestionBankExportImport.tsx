import { Download, Loader2, Upload } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { useToast } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import type { QuestionBankItem } from '@/features/question-bank/api/questionBankService'
import { questionBankService } from '@/features/question-bank/api/questionBankService'

interface QuestionExportFormat {
  version: string
  exportedAt: string
  tenantId: string
  questions: Array<{
    question_text: string
    question_type: string
    options?: Array<{ text: string; is_correct: boolean }>
    correct_answer?: string
    explanation?: string
    difficulty: string
    subject?: string
    tags?: string[]
  }>
}

export function QuestionBankExportImport() {
  const { tenantId } = useAuth()
  const addToast = useToast((s) => s.addToast)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const questions = await questionBankService.searchQuestions({
        limit: 1000,
      })

      const exportData: QuestionExportFormat = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        tenantId: tenantId ?? '',
        questions: (questions ?? []).map((q: QuestionBankItem) => ({
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options?.map((o) => ({ text: o.option_text, is_correct: o.is_correct })),
          explanation: q.explanation ?? undefined,
          difficulty: String(q.difficulty_level),
          subject: q.subject_id ?? undefined,
          tags: q.tags,
        })),
      }

      const json = JSON.stringify(exportData, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bank-soal-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      addToast({ type: 'success', message: `${questions?.length ?? 0} soal berhasil di-export` })
    } catch {
      addToast({ type: 'error', message: 'Gagal mengexport soal' })
    }
    setExporting(false)
  }, [tenantId, addToast])

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setImporting(true)
      try {
        const text = await file.text()
        const data: QuestionExportFormat = JSON.parse(text)

        if (!data.questions || !Array.isArray(data.questions)) {
          throw new Error('Format file tidak valid')
        }

        // ⚡ Bolt: Parallelize question bank imports
        const results = await Promise.allSettled(
          data.questions.map((q) =>
            questionBankService.createQuestion({
              subject_id: q.subject,
              type: q.question_type as any,
              text: q.question_text,
              explanation: q.explanation,
              difficulty_level: parseInt(q.difficulty, 10) || 3,
              options:
                q.options?.map((o, i) => ({
                  option_text: o.text,
                  is_correct: o.is_correct,
                  order_index: i,
                })) ?? [],
              tags: q.tags ?? [],
            })
          )
        )
        const imported = results.filter((r) => r.status === 'fulfilled').length

        addToast({
          type: imported > 0 ? 'success' : 'error',
          message: `${imported}/${data.questions.length} soal berhasil di-import`,
        })
      } catch {
        addToast({ type: 'error', message: 'File tidak valid. Pastikan format JSON benar.' })
      }
      setImporting(false)

      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [addToast]
  )

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-4">
      <h3 className="font-semibold text-slate-900 dark:text-white">Export / Import Soal</h3>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export Soal
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Import Soal
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
          aria-label="Import file soal dalam format JSON"
        />
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Format: JSON. File export dapat di-import ke instance EduSync lain.
      </p>
    </div>
  )
}
