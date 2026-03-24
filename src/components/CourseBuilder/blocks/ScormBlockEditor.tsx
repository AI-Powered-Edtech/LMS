import {
  AlertCircle,
  CheckCircle2,
  FileArchive,
  Loader2,
  Package,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { useAuth } from '@/src/contexts/AuthContext'
import { useBuilder } from '@/src/contexts/BuilderContext'
import { supabase } from '@/src/services/supabase/client'

interface ScormBlockEditorProps {
  blockId: string
}

const MAX_ZIP_SIZE = 100 * 1024 * 1024 // 100MB

interface ScormExtractResponse {
  success: boolean
  scorm_package_id: string
  title: string
  scorm_version: '1.2' | '2004'
  entry_point: string
  files_extracted: number
  upload_errors: number
  error?: string
}

export function ScormBlockEditor({ blockId }: ScormBlockEditorProps) {
  const { state, actions } = useBuilder()
  const { user, tenantId } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const block = state.activeLesson?.blocks.find((b) => b.id === blockId)

  const scormMeta = block?.metadata as
    | {
        scorm_package_id?: string
        scorm_version?: string
        entry_point?: string
        file_count?: number
      }
    | undefined

  const hasPackage = !!scormMeta?.scorm_package_id

  const handleUpload = useCallback(
    async (file: File) => {
      if (!state.courseId || !state.activeLesson) {
        setError('Kursus atau materi belum dimuat')
        return
      }

      if (!user || !tenantId) {
        setError('Sesi tidak valid. Silakan login ulang.')
        return
      }

      setError(null)

      // Validate file type
      if (!file.name.toLowerCase().endsWith('.zip')) {
        setError('Hanya file ZIP yang didukung untuk paket SCORM.')
        return
      }

      // Validate file size
      if (file.size > MAX_ZIP_SIZE) {
        setError(`Ukuran file maksimal ${MAX_ZIP_SIZE / 1024 / 1024}MB.`)
        return
      }

      setIsUploading(true)
      setUploadProgress('Mengunggah paket SCORM...')

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('lesson_id', state.activeLesson.id)
        formData.append('course_id', state.courseId)

        setUploadProgress('Mengekstrak dan memvalidasi manifest...')

        const { data, error: fnError } = await supabase.functions.invoke<ScormExtractResponse>(
          'scorm-extract',
          { body: formData }
        )

        if (fnError) {
          throw new Error(fnError.message || 'Gagal memproses paket SCORM.')
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Gagal memproses paket SCORM.')
        }

        setUploadProgress('Menyimpan metadata...')

        // Update block metadata with SCORM package info
        actions.updateBlock(blockId, {
          title: data.title,
          content: `Modul SCORM ${data.scorm_version}: ${data.title}`,
          metadata: {
            scorm_package_id: data.scorm_package_id,
            scorm_version: data.scorm_version,
            entry_point: data.entry_point,
            file_count: data.files_extracted,
          },
        })

        setUploadProgress(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Gagal mengunggah paket SCORM.'
        setError(message)
        setUploadProgress(null)
      } finally {
        setIsUploading(false)
      }
    },
    [state.courseId, state.activeLesson, blockId, user, tenantId, actions]
  )

  const handleRemovePackage = async () => {
    if (!confirm('Hapus paket SCORM dari blok ini?')) return

    // Remove the scorm_packages record (cascade will clean up runtime data)
    if (scormMeta?.scorm_package_id) {
      try {
        await supabase
          .from('scorm_packages')
          .delete()
          .eq('id', scormMeta.scorm_package_id)
          .eq('tenant_id', tenantId!)
      } catch {
        // Non-fatal — metadata will be cleared regardless
      }
    }

    actions.updateBlock(blockId, {
      title: null,
      content: null,
      metadata: {},
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }

  if (!block) return null

  // ── Uploaded state ──────────────────────────────────────────
  if (hasPackage) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-5 border border-emerald-200 dark:border-emerald-800 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30">
          <div className="p-2.5 bg-white dark:bg-emerald-900 rounded-xl shadow-sm">
            <Package className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
              {block.title || 'Modul SCORM'}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900 px-2 py-0.5 rounded-full">
                SCORM {scormMeta?.scorm_version}
              </span>
              {scormMeta?.file_count && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {scormMeta.file_count} file
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                Terpasang
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Ganti Paket
          </button>
          <button
            type="button"
            onClick={handleRemovePackage}
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          className="hidden"
        />

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>
    )
  }

  // ── Empty / Uploading state ─────────────────────────────────
  return (
    <div className="space-y-4">
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          'relative flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed cursor-pointer transition-all',
          isDragOver
            ? 'border-teal-400 bg-teal-50 dark:border-teal-500 dark:bg-teal-950/30'
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-800/50',
          isUploading ? 'pointer-events-none' : '',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          className="hidden"
        />

        {isUploading ? (
          <>
            <Loader2 className="w-8 h-8 text-teal-600 dark:text-teal-400 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {uploadProgress || 'Memproses...'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Proses ini mungkin memerlukan beberapa saat untuk paket besar
            </p>
          </>
        ) : (
          <>
            <div className="p-3 bg-white dark:bg-slate-700 rounded-xl shadow-sm mb-3">
              <Upload className="w-8 h-8 text-teal-500 dark:text-teal-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Unggah paket SCORM
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              File ZIP dengan imsmanifest.xml (maks. 100MB)
            </p>
            <div className="flex items-center gap-2 mt-3">
              <FileArchive className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                SCORM 1.2 &amp; 2004
              </span>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
