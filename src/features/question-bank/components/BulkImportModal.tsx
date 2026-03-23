import { AlertTriangle, CheckCircle, Download, FileText, Loader2, Upload, X } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { questionBankService } from '@/src/features/question-bank/api/questionBankService'
import type {
  ParsedQuestion,
  ParseResult,
} from '@/src/features/question-bank/utils/csvQuestionParser'
import {
  generateTemplateCSV,
  parseCSVQuestions,
} from '@/src/features/question-bank/utils/csvQuestionParser'
import { useToast } from '@/src/hooks/useToast'
import { cn } from '@/src/utils/cn'

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess: (count: number) => void
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'done'

export function BulkImportModal({ isOpen, onClose, onImportSuccess }: BulkImportModalProps) {
  const { addToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<ImportStep>('upload')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, errors: 0 })
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)

  const reset = useCallback(() => {
    setStep('upload')
    setParseResult(null)
    setImportProgress({ done: 0, total: 0, errors: 0 })
    setImportErrors([])
    setDragOver(false)
  }, [])

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.csv')) {
        addToast({ type: 'error', message: 'Hanya file CSV yang didukung' })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        const result = parseCSVQuestions(content)
        setParseResult(result)
        setStep('preview')
      }
      reader.readAsText(file)
    },
    [addToast]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const downloadTemplate = () => {
    const csv = generateTemplateCSV()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_soal_edusync.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (!parseResult || parseResult.questions.length === 0) return

    setStep('importing')
    const total = parseResult.questions.length
    setImportProgress({ done: 0, total, errors: 0 })
    const errors: string[] = []
    let done = 0

    for (const q of parseResult.questions) {
      try {
        await questionBankService.createQuestion({
          type: q.type,
          text: q.text,
          explanation: q.explanation || undefined,
          difficulty_level: q.difficulty,
          options: q.options,
          tags: q.tags,
        })
        done++
      } catch (err) {
        errors.push(
          `"${q.text.slice(0, 40)}...": ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`
        )
        done++
      }
      setImportProgress({ done, total, errors: errors.length })
    }

    setImportErrors(errors)
    setStep('done')
    if (done - errors.length > 0) {
      onImportSuccess(done - errors.length)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Impor Soal CSV</h2>
              <p className="text-xs text-slate-400">
                Upload file CSV untuk menambahkan soal massal
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-7">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-[24px] p-12 text-center cursor-pointer transition-all',
                  dragOver
                    ? 'border-indigo-400 bg-indigo-50/50'
                    : 'border-slate-200 bg-slate-50/30 hover:border-indigo-300 hover:bg-indigo-50/20'
                )}
              >
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-600">
                  Drag & drop file CSV atau{' '}
                  <span className="text-indigo-600">klik untuk memilih</span>
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Format: .csv — Maks. 500 soal per import
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              {/* Template download */}
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Template CSV
              </button>

              {/* Format guide */}
              <div className="bg-slate-50 rounded-[20px] p-5 space-y-2">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  Format Kolom
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    ['question_text', 'Teks soal (wajib)'],
                    ['question_type', 'MCQ / TRUE_FALSE / MULTIPLE_SELECT / SHORT_ANSWER / ESSAY'],
                    ['difficulty', 'Tingkat kesulitan 1-5'],
                    ['explanation', 'Penjelasan jawaban'],
                    ['tags', 'Tag dipisah koma'],
                    ['option1, correct1, ...', 'Pasangan opsi & status benar/salah'],
                  ].map(([col, desc]) => (
                    <div key={col} className="text-[10px] text-slate-500">
                      <span className="font-mono font-bold text-indigo-600">{col}</span> — {desc}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && parseResult && (
            <div className="space-y-5">
              {/* Summary badges */}
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-black rounded-xl">
                  {parseResult.questions.length} soal valid
                </span>
                {parseResult.errors.length > 0 && (
                  <span className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-black rounded-xl">
                    {parseResult.errors.length} error
                  </span>
                )}
                <span className="px-3 py-1.5 bg-slate-100 text-slate-500 text-xs font-bold rounded-xl">
                  {parseResult.totalRows} baris total
                </span>
              </div>

              {/* Errors */}
              {parseResult.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-[16px] p-4 space-y-1">
                  <p className="text-xs font-bold text-red-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Error pada baris berikut:
                  </p>
                  {parseResult.errors.map((err, i) => (
                    <p key={i} className="text-[11px] text-red-600 font-mono">
                      Baris {err.row}: {err.message}
                    </p>
                  ))}
                </div>
              )}

              {/* Preview table */}
              {parseResult.questions.length > 0 && (
                <div className="border border-slate-200 rounded-[16px] overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <th className="px-4 py-2.5 text-left">#</th>
                        <th className="px-4 py-2.5 text-left">Soal</th>
                        <th className="px-4 py-2.5 text-left">Tipe</th>
                        <th className="px-4 py-2.5 text-center">Diff</th>
                        <th className="px-4 py-2.5 text-center">Opsi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.questions.slice(0, 20).map((q: ParsedQuestion, i: number) => (
                        <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-2 text-slate-400 font-mono">{i + 1}</td>
                          <td className="px-4 py-2 text-slate-700 font-medium max-w-[240px] truncate">
                            {q.text}
                          </td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold">
                              {q.type}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center font-bold text-slate-500">
                            {q.difficulty}
                          </td>
                          <td className="px-4 py-2 text-center text-slate-400">
                            {q.options.length}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parseResult.questions.length > 20 && (
                    <p className="text-[10px] text-slate-400 text-center py-2 bg-slate-50">
                      +{parseResult.questions.length - 20} soal lainnya...
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 space-y-5">
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700">
                  Mengimpor soal... {importProgress.done}/{importProgress.total}
                </p>
                <div className="w-64 h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-slate-800">Impor Selesai!</p>
                <p className="text-sm text-slate-500 mt-1">
                  {importProgress.total - importProgress.errors} soal berhasil diimpor
                  {importProgress.errors > 0 && (
                    <span className="text-red-500">, {importProgress.errors} gagal</span>
                  )}
                </p>
              </div>
              {importErrors.length > 0 && (
                <div className="w-full bg-red-50 border border-red-200 rounded-[16px] p-4 max-h-40 overflow-y-auto space-y-1">
                  {importErrors.map((err, i) => (
                    <p key={i} className="text-[11px] text-red-600 font-mono">
                      {err}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-7 py-4 border-t border-slate-100 bg-slate-50/50">
          {step === 'upload' && (
            <button
              onClick={handleClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
          )}
          {step === 'preview' && (
            <>
              <button
                onClick={reset}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Kembali
              </button>
              <button
                onClick={handleImport}
                disabled={!parseResult || parseResult.questions.length === 0}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import {parseResult?.questions.length || 0} Soal
              </button>
            </>
          )}
          {step === 'done' && (
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-100 transition-all"
            >
              Selesai
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
