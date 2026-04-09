// EduSync LMS — useBulkImport Hook
// Manages chunked import state, progress tracking, and error handling

import { useCallback, useState } from 'react'

import { useToast } from '@/hooks/useToast'

import {
  type BulkImportResult,
  type BulkImportRow,
  createImportJob,
  exportFailedRowsCSV,
  type ImportPreview,
  runChunkedImport,
  type ValidatedRow,
  validateImportRows,
} from '../api/bulkImportService'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImportStep = 'upload' | 'preview' | 'processing' | 'result'

export interface UseBulkImportReturn {
  step: ImportStep
  preview: ImportPreview | null
  result: BulkImportResult | null
  progress: number
  currentChunk: number
  totalChunks: number
  chunkStatus: string
  isProcessing: boolean
  validatedRows: ValidatedRow[]
  originalRows: Record<string, string>[]
  // Actions
  parseCSV: (content: string) => void
  processImport: (tenantId: string) => Promise<void>
  downloadFailedRows: () => void
  reset: () => void
  goToPreview: () => void
  goToUpload: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook for managing the bulk import workflow.
 * Handles CSV parsing, validation, chunked import, progress tracking, and error export.
 */
export function useBulkImport(): UseBulkImportReturn {
  const [step, setStep] = useState<ImportStep>('upload')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [result, setResult] = useState<BulkImportResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentChunk, setCurrentChunk] = useState(0)
  const [totalChunks, setTotalChunks] = useState(0)
  const [chunkStatus, setChunkStatus] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([])
  const [originalRows, setOriginalRows] = useState<Record<string, string>[]>([])

  const addToast = useToast((s) => s.addToast)

  // ---------------------------------------------------------------------------
  // CSV Parsing & Validation
  // ---------------------------------------------------------------------------

  const parseCSV = useCallback(
    (content: string) => {
      // Simple CSV parser (for production, use PapaParse)
      const lines = content.split('\n').filter((line) => line.trim())
      if (lines.length < 2) {
        addToast({ type: 'error', message: 'File CSV kosong atau tidak memiliki header.' })
        return
      }

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
      const rows: Record<string, string>[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
        const row: Record<string, string> = {}
        headers.forEach((header, j) => {
          row[header] = values[j] ?? ''
        })
        rows.push(row)
      }

      setOriginalRows(rows)

      // Validate
      const validationResult = validateImportRows(rows)
      setPreview(validationResult)
      setValidatedRows(validationResult.validatedRows)

      setStep('preview')
    },
    [addToast]
  )

  // ---------------------------------------------------------------------------
  // Import Processing
  // ---------------------------------------------------------------------------

  const processImport = useCallback(
    async (tenantId: string) => {
      if (!preview || !preview.canProceed) {
        addToast({ type: 'error', message: 'Tidak ada baris valid untuk diproses.' })
        return
      }

      setIsProcessing(true)
      setStep('processing')
      setProgress(0)

      try {
        // Filter rows to process
        const rowsToProcess: BulkImportRow[] = validatedRows
          .filter((r) => r._valid)
          .map(({ _rowIndex: _, _errors: __, _valid: ___, ...row }) => row)

        // Create job
        const jobId = await createImportJob(tenantId, rowsToProcess.length)
        const totalChunks = Math.ceil(rowsToProcess.length / 50)
        setTotalChunks(totalChunks)
        setProgress(10)

        // Run chunked import
        const importResult = await runChunkedImport(
          rowsToProcess,
          tenantId,
          jobId,
          (chunkIndex, total, _chunkResult) => {
            setCurrentChunk(chunkIndex + 1)
            setChunkStatus(
              total > 1
                ? `Memproses bagian ${chunkIndex + 1} dari ${total}...`
                : 'Memproses data...'
            )
            setProgress(Math.round(((chunkIndex + 1) / total) * 90) + 10)
          }
        )

        setResult(importResult)
        setProgress(100)
        setStep('result')

        // Show appropriate toast
        if (importResult.status === 'completed') {
          addToast({
            type: 'success',
            message: `Berhasil mengimpor ${importResult.success} pengguna.`,
          })
        } else if (importResult.status === 'partial') {
          addToast({
            type: 'warning',
            message: `Import selesai: ${importResult.success} berhasil, ${importResult.failed} gagal.`,
          })
        } else {
          addToast({
            type: 'error',
            message: 'Import gagal. Periksa error detail.',
          })
        }
      } catch (err: any) {
        addToast({
          type: 'error',
          message: err.message || 'Terjadi kesalahan saat memproses import.',
        })
        setStep('preview')
      } finally {
        setIsProcessing(false)
      }
    },
    [preview, validatedRows, addToast]
  )

  // ---------------------------------------------------------------------------
  // Export Failed Rows
  // ---------------------------------------------------------------------------

  const downloadFailedRows = useCallback(() => {
    if (!result || result.errors.length === 0) return

    const csvContent = exportFailedRowsCSV(result.errors, originalRows as BulkImportRow[])
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `failed_rows_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    addToast({
      type: 'success',
      message: 'File CSV baris gagal berhasil diunduh. Perbaiki dan upload ulang.',
    })
  }, [result, originalRows, addToast])

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const reset = useCallback(() => {
    setStep('upload')
    setPreview(null)
    setResult(null)
    setProgress(0)
    setCurrentChunk(0)
    setTotalChunks(0)
    setChunkStatus('')
    setIsProcessing(false)
    setValidatedRows([])
    setOriginalRows([])
  }, [])

  const goToPreview = useCallback(() => {
    setStep('preview')
  }, [])

  const goToUpload = useCallback(() => {
    setStep('upload')
  }, [])

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    step,
    preview,
    result,
    progress,
    currentChunk,
    totalChunks,
    chunkStatus,
    isProcessing,
    validatedRows,
    originalRows,
    parseCSV,
    processImport,
    downloadFailedRows,
    reset,
    goToPreview,
    goToUpload,
  }
}
