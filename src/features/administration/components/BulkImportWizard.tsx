import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import Papa from 'papaparse'
import { useCallback, useRef, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'

import {
  type BulkImportRow,
  createImportJob,
  type RowError,
  runBulkImport,
} from '../api/bulkImportService'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedRow extends BulkImportRow {
  _rowIndex: number
  _errors: string[]
  _valid: boolean
}

interface ImportResultRow extends BulkImportRow {
  _rowIndex: number
  status: 'berhasil' | 'gagal'
  reason?: string
}

interface BulkImportWizardProps {
  onClose: () => void
  onSuccess?: () => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_ROLES = ['siswa', 'guru', 'admin'] as const
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

const TEMPLATE_CSV = `email,nama_lengkap,peran,nis,nomor_hp
siswa@sekolah.sch.id,Ahmad Rizki,siswa,12345,08123456789
guru@sekolah.sch.id,Bu Ratna Dewi,guru,,08987654321
admin@sekolah.sch.id,Pak Budi Santoso,admin,,
`

// ─── Step Indicator ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Template' },
  { id: 2, label: 'Upload' },
  { id: 3, label: 'Validasi' },
  { id: 4, label: 'Proses' },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, idx) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                current === step.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : current > step.id
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              )}
            >
              {current > step.id ? <CheckCircle2 className="w-4 h-4" /> : step.id}
            </div>
            <span
              className={cn(
                'text-xs font-medium whitespace-nowrap',
                current === step.id
                  ? 'text-blue-600 dark:text-blue-400'
                  : current > step.id
                    ? 'text-emerald-500'
                    : 'text-slate-400 dark:text-slate-500'
              )}
            >
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div
              className={cn(
                'w-12 h-0.5 mx-1 mb-5 transition-all',
                current > step.id ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BulkImportWizard({ onClose, onSuccess }: BulkImportWizardProps) {
  const { tenantId } = useAuth()
  const addToast = useToast((s) => s.addToast)

  const [step, setStep] = useState(1)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [skipInvalid, setSkipInvalid] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [importResults, setImportResults] = useState<ImportResultRow[]>([])
  const [successCount, setSuccessCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Step 1: Download Template ────────────────────────────────────────────

  const downloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template_import_pengguna.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Step 2: File Upload & Parse ──────────────────────────────────────────

  const validateAndParseFile = useCallback((file: File) => {
    setFileError('')

    if (!file.name.match(/\.(csv)$/i)) {
      setFileError('Hanya file .csv yang didukung.')
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`Ukuran file maksimum ${MAX_FILE_SIZE_MB}MB.`)
      return
    }

    setFileName(file.name)

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        if (results.data.length === 0) {
          setFileError('File CSV kosong atau tidak ada data.')
          return
        }

        const rows: ParsedRow[] = results.data.map((raw, idx) => {
          const email = (raw['email'] ?? '').trim()
          const full_name = (raw['nama_lengkap'] ?? '').trim()
          const role = (raw['peran'] ?? '').trim().toLowerCase()
          const nis = (raw['nis'] ?? '').trim() || undefined
          const nomor_hp = (raw['nomor_hp'] ?? '').trim() || undefined

          const errors: string[] = []

          if (!email) errors.push('Email wajib diisi')
          else if (!EMAIL_REGEX.test(email)) errors.push('Format email tidak valid')

          if (!full_name) errors.push('Nama lengkap wajib diisi')

          if (!role) errors.push('Peran wajib diisi')
          else if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number]))
            errors.push(`Peran tidak dikenal: "${role}". Gunakan: siswa, guru, atau admin`)

          return {
            _rowIndex: idx + 1,
            _errors: errors,
            _valid: errors.length === 0,
            email,
            full_name,
            role,
            nis,
            nomor_hp,
          }
        })

        setParsedRows(rows)
        setStep(3)
      },
      error: (err) => {
        setFileError(`Gagal membaca file: ${err.message}`)
      },
    })
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndParseFile(file)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) validateAndParseFile(file)
    },
    [validateAndParseFile]
  )

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  // ── Step 3: Preview & Validasi ───────────────────────────────────────────

  const validRows = parsedRows.filter((r) => r._valid)
  const invalidRows = parsedRows.filter((r) => !r._valid)
  const rowsToProcess = skipInvalid ? validRows : parsedRows.filter((r) => r._valid)

  // ── Step 4: Proses ───────────────────────────────────────────────────────

  const handleProcess = async () => {
    if (!tenantId) {
      addToast({ type: 'error', message: 'Tenant ID tidak ditemukan.' })
      return
    }

    if (rowsToProcess.length === 0) {
      addToast({ type: 'error', message: 'Tidak ada baris valid untuk diproses.' })
      return
    }

    setIsProcessing(true)
    setStep(4)
    setProgress(10)

    try {
      // Buat import job di database
      const importJobId = await createImportJob(tenantId)
      setProgress(20)

      const rows: BulkImportRow[] = rowsToProcess.map((r) => ({
        email: r.email,
        full_name: r.full_name,
        role: r.role,
        nis: r.nis,
        nomor_hp: r.nomor_hp,
      }))

      setProgress(40)

      // Panggil Edge Function
      const result = await runBulkImport(rows, tenantId, importJobId)
      setProgress(90)

      // Bangun hasil per-row
      const errorMap = new Map<number, string>()
      result.errors.forEach((e: RowError) => errorMap.set(e.row, e.reason))

      const resultRows: ImportResultRow[] = rowsToProcess.map((r, idx) => {
        const serverRow = idx + 1
        const errReason = errorMap.get(serverRow)
        return {
          ...r,
          status: errReason ? 'gagal' : 'berhasil',
          reason: errReason,
        }
      })

      setImportResults(resultRows)
      setSuccessCount(result.success)
      setFailedCount(result.failed)
      setProgress(100)

      if (result.status === 'completed') {
        addToast({
          type: 'success',
          message: `Berhasil mengimpor ${result.success} pengguna.`,
        })
        onSuccess?.()
      } else if (result.status === 'partial') {
        addToast({
          type: 'warning',
          message: `Impor selesai: ${result.success} berhasil, ${result.failed} gagal.`,
        })
      } else {
        addToast({
          type: 'error',
          message: 'Semua baris gagal diimpor. Periksa laporan untuk detailnya.',
        })
      }
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses impor.',
      })
      setProgress(0)
      setStep(3)
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Download Laporan ─────────────────────────────────────────────────────

  const downloadReport = () => {
    const reportRows = importResults.map((r) => ({
      email: r.email,
      nama_lengkap: r.full_name,
      peran: r.role,
      nis: r.nis ?? '',
      nomor_hp: r.nomor_hp ?? '',
      status: r.status,
      keterangan: r.reason ?? '',
    }))

    const csv = Papa.unparse(reportRows, {
      header: true,
      columns: ['email', 'nama_lengkap', 'peran', 'nis', 'nomor_hp', 'status', 'keterangan'],
    })

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan_impor_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Reset ────────────────────────────────────────────────────────────────

  const resetWizard = () => {
    setStep(1)
    setParsedRows([])
    setFileName('')
    setFileError('')
    setIsDragging(false)
    setSkipInvalid(true)
    setIsProcessing(false)
    setProgress(0)
    setImportResults([])
    setSuccessCount(0)
    setFailedCount(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose()
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Impor Massal Pengguna
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Upload CSV untuk menambah banyak pengguna sekaligus
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            aria-label="Tutup wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-6 shrink-0">
          <StepIndicator current={step} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* ── Step 1: Template ────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Format File CSV
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                  Download template di bawah dan isi sesuai format berikut:
                </p>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full border-collapse">
                    <thead>
                      <tr className="bg-blue-100 dark:bg-blue-900/40">
                        {['Kolom', 'Keterangan', 'Contoh', 'Wajib'].map((h) => (
                          <th
                            key={h}
                            className="text-left px-3 py-2 font-semibold text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-blue-700 dark:text-blue-400">
                      {[
                        ['email', 'Alamat email pengguna', 'siswa@sekolah.sch.id', 'Ya'],
                        ['nama_lengkap', 'Nama lengkap', 'Ahmad Rizki', 'Ya'],
                        ['peran', 'siswa / guru / admin', 'siswa', 'Ya'],
                        ['nis', 'Nomor Induk Siswa (opsional)', '12345', 'Tidak'],
                        ['nomor_hp', 'Nomor HP (opsional)', '08123456789', 'Tidak'],
                      ].map(([col, desc, ex, req]) => (
                        <tr key={col} className="border border-blue-200 dark:border-blue-700">
                          <td className="px-3 py-1.5 font-mono font-semibold">{col}</td>
                          <td className="px-3 py-1.5">{desc}</td>
                          <td className="px-3 py-1.5 font-mono">{ex}</td>
                          <td className="px-3 py-1.5">
                            <span
                              className={cn(
                                'px-1.5 py-0.5 rounded text-xs font-medium',
                                req === 'Ya'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              )}
                            >
                              {req}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <strong>Catatan:</strong> File harus dalam format UTF-8 agar nama dengan huruf
                  khusus (é, ñ, dll) terbaca dengan benar. Ukuran maksimum file adalah{' '}
                  {MAX_FILE_SIZE_MB}MB.
                </p>
              </div>

              <button
                onClick={downloadTemplate}
                className="w-full flex items-center justify-center gap-3 py-3.5 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold rounded-xl transition-all"
              >
                <Download className="w-5 h-5" />
                Unduh Template CSV
              </button>

              <button
                onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Saya sudah punya file, lanjut upload
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 2: Upload ───────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-6">
              <div
                role="button"
                tabIndex={0}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all',
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                )}
              >
                <Upload
                  className={cn(
                    'w-12 h-12 mx-auto mb-4 transition-colors',
                    isDragging ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'
                  )}
                />
                <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  {fileName ? (
                    <span className="text-blue-600 dark:text-blue-400 flex items-center justify-center gap-2">
                      <FileText className="w-4 h-4" />
                      {fileName}
                    </span>
                  ) : (
                    'Tarik file ke sini atau klik untuk memilih'
                  )}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Format: .csv — Maks. {MAX_FILE_SIZE_MB}MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {fileError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {fileError}
                </div>
              )}

              <button
                onClick={() => setStep(1)}
                className="w-full py-2.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                ← Kembali ke template
              </button>
            </div>
          )}

          {/* ── Step 3: Preview & Validasi ───────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {parsedRows.length}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Total Baris</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{validRows.length}</p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-0.5">
                    Baris Valid
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{invalidRows.length}</p>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">Bermasalah</p>
                </div>
              </div>

              {/* Toggle skip invalid */}
              {invalidRows.length > 0 && (
                <label className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipInvalid}
                    onChange={(e) => setSkipInvalid(e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                  <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                    Abaikan {invalidRows.length} baris bermasalah dan proses {validRows.length}{' '}
                    baris valid saja
                  </span>
                </label>
              )}

              {/* Data Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        {['#', 'Email', 'Nama Lengkap', 'Peran', 'NIS', 'Status'].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row) => (
                        <tr
                          key={row._rowIndex}
                          className={cn(
                            'border-b border-slate-100 dark:border-slate-800',
                            !row._valid && 'bg-red-50/50 dark:bg-red-900/10'
                          )}
                        >
                          <td className="px-3 py-2 text-slate-400 dark:text-slate-500">
                            {row._rowIndex}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">
                            {row.email || <span className="text-red-400 italic">kosong</span>}
                          </td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                            {row.full_name || <span className="text-red-400 italic">kosong</span>}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded-full font-medium text-xs',
                                row.role === 'siswa'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                  : row.role === 'guru'
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                    : row.role === 'admin'
                                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                      : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                              )}
                            >
                              {row.role || 'tidak diketahui'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                            {row.nis ?? '-'}
                          </td>
                          <td className="px-3 py-2">
                            {row._valid ? (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Valid
                              </span>
                            ) : (
                              <div className="flex items-start gap-1 text-red-600">
                                <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                <span>{row._errors.join('; ')}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  ← Ganti File
                </button>
                <button
                  onClick={handleProcess}
                  disabled={rowsToProcess.length === 0}
                  className="flex-1 py-2.5 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all"
                >
                  Proses {rowsToProcess.length} Pengguna →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Proses & Hasil ───────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-6">
              {isProcessing ? (
                <div className="text-center py-8">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
                  <p className="font-semibold text-slate-700 dark:text-slate-200 mb-4">
                    Sedang memproses impor...
                  </p>
                  {/* Progress Bar */}
                  <div className="relative h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden max-w-sm mx-auto">
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    {progress}% selesai
                  </p>
                </div>
              ) : (
                <>
                  {/* Hasil Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-emerald-600">{successCount}</p>
                      <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Berhasil Diimpor
                      </p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
                      <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-red-600">{failedCount}</p>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-0.5">Gagal</p>
                    </div>
                  </div>

                  {/* Tabel Hasil */}
                  {importResults.length > 0 && (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 dark:bg-slate-800 px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Detail Hasil Import
                        </p>
                      </div>
                      <div className="overflow-x-auto max-h-56">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800">
                              {['Email', 'Nama', 'Peran', 'Status', 'Keterangan'].map((h) => (
                                <th
                                  key={h}
                                  className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-slate-400"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {importResults.map((r, i) => (
                              <tr
                                key={i}
                                className={cn(
                                  'border-b border-slate-100 dark:border-slate-800',
                                  r.status === 'gagal' && 'bg-red-50/50 dark:bg-red-900/10'
                                )}
                              >
                                <td className="px-3 py-1.5 font-mono text-slate-700 dark:text-slate-300">
                                  {r.email}
                                </td>
                                <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400">
                                  {r.full_name}
                                </td>
                                <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400">
                                  {r.role}
                                </td>
                                <td className="px-3 py-1.5">
                                  {r.status === 'berhasil' ? (
                                    <span className="flex items-center gap-1 text-emerald-600">
                                      <CheckCircle2 className="w-3 h-3" /> Berhasil
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-red-500">
                                      <XCircle className="w-3 h-3" /> Gagal
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400 italic">
                                  {r.reason ?? '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={downloadReport}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Unduh Laporan
                    </button>
                    {failedCount > 0 && (
                      <button
                        onClick={resetWizard}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      >
                        Impor Ulang
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="flex-1 py-2.5 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-bold rounded-xl text-sm transition-all"
                    >
                      Selesai
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
