import { AlertCircle, CheckCircle2, FileText, Upload, XCircle } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { cn } from '@/utils/cn'

import type { BulkImportRow } from '../../api/bulkImportService'

interface ParsedRow extends BulkImportRow {
  _rowIndex: number
  _errors: string[]
  _valid: boolean
}

const VALID_ROLES = ['siswa', 'guru', 'admin'] as const
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const MAX_ROWS = 500

interface BulkImportPreviewStepProps {
  onFileParsed: (rows: ParsedRow[]) => void
  onBack: () => void
  onProcess: (rows: ParsedRow[]) => void
  isProcessing: boolean
}

export function BulkImportPreviewStep({
  onFileParsed,
  onBack,
  onProcess,
  isProcessing,
}: BulkImportPreviewStepProps) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [skipInvalid, setSkipInvalid] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateAndParseFile = useCallback(
    (file: File) => {
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

      import('papaparse').then((Papa) => {
        Papa.default.parse<Record<string, string>>(file, {
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

            const validParsedRows = rows.filter((r) => r._valid)
            if (validParsedRows.length > MAX_ROWS) {
              setFileError(
                `Terlalu banyak baris valid (${validParsedRows.length}). Maksimum ${MAX_ROWS} baris per impor. Silakan bagi menjadi beberapa file.`
              )
              return
            }

            setParsedRows(rows)
            onFileParsed(rows)
          },
          error: (err) => {
            setFileError(`Gagal membaca file: ${err.message}`)
          },
        })
      })
    },
    [onFileParsed]
  )

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

  const validRows = parsedRows.filter((r) => r._valid)
  const invalidRows = parsedRows.filter((r) => !r._valid)
  const rowsToProcess = skipInvalid ? validRows : validRows

  const handleProcess = () => {
    onProcess(rowsToProcess)
  }

  return (
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
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Maksimum 500 baris per file. Untuk lebih dari 500 pengguna, bagi menjadi beberapa file.
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

      {parsedRows.length > 0 && (
        <>
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

          {invalidRows.length > 0 && (
            <label className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={skipInvalid}
                onChange={(e) => setSkipInvalid(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500"
              />
              <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                Abaikan {invalidRows.length} baris bermasalah dan proses {validRows.length} baris
                valid saja
              </span>
            </label>
          )}

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

          <div className="flex gap-3 pt-2">
            <button
              onClick={onBack}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              ← Kembali
            </button>
            <button
              onClick={handleProcess}
              disabled={rowsToProcess.length === 0 || isProcessing}
              className="flex-1 py-2.5 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all"
            >
              Proses {rowsToProcess.length} Pengguna →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
