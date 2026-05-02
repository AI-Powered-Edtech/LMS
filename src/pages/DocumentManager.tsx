/**
 * DocumentManager.tsx — Manajemen Surat & Dokumen Sekolah.
 *
 * Fitur:
 *  - Ringkasan per kategori
 *  - Filter kategori & pencarian
 *  - Upload dokumen (drag-drop + form metadata)
 *  - List view: judul, tanggal, ukuran, kategori, aksi
 *  - Visibility toggle: Admin / Guru & Admin / Semua
 */

import {
  AlertTriangle,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  Button,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
} from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import {
  documentApi,
  type DocumentCategory,
  type DocumentFilter,
  type DocumentVisibility,
  type SchoolDocument,
} from '@/features/administration/api/documentApi'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'
import { sanitizeUrl } from '@/utils/sanitize'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  surat_masuk: 'Surat Masuk',
  surat_keluar: 'Surat Keluar',
  sk: 'SK',
  pengumuman: 'Pengumuman',
  rapor: 'Rapor',
  umum: 'Umum',
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Semua Kategori' },
  { value: 'surat_masuk', label: 'Surat Masuk' },
  { value: 'surat_keluar', label: 'Surat Keluar' },
  { value: 'sk', label: 'SK' },
  { value: 'pengumuman', label: 'Pengumuman' },
  { value: 'rapor', label: 'Rapor' },
  { value: 'umum', label: 'Umum' },
]

const VISIBILITY_OPTIONS = [
  { value: 'admin', label: 'Admin Saja' },
  { value: 'teacher', label: 'Guru & Admin' },
  { value: 'all', label: 'Semua' },
]

const CATEGORY_UPLOAD_OPTIONS = [
  { value: 'surat_masuk', label: 'Surat Masuk' },
  { value: 'surat_keluar', label: 'Surat Keluar' },
  { value: 'sk', label: 'SK' },
  { value: 'pengumuman', label: 'Pengumuman' },
  { value: 'rapor', label: 'Rapor' },
  { value: 'umum', label: 'Umum' },
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatRelativeDate(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHour = Math.floor(diffMs / 3_600_000)
  const diffDay = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return 'Baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  if (diffHour < 24) return `${diffHour} jam lalu`
  if (diffDay < 7) return `${diffDay} hari lalu`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} minggu lalu`
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getFileIcon(fileType: string | null): string {
  if (!fileType) return 'file'
  if (fileType.includes('pdf')) return 'pdf'
  if (fileType.includes('word') || fileType.includes('document')) return 'doc'
  if (fileType.includes('excel') || fileType.includes('sheet')) return 'xls'
  if (fileType.includes('image')) return 'img'
  return 'file'
}

const FILE_ICON_COLORS: Record<string, string> = {
  pdf: 'text-red-500 dark:text-red-400',
  doc: 'text-blue-500 dark:text-blue-400',
  xls: 'text-green-500 dark:text-green-400',
  img: 'text-purple-500 dark:text-purple-400',
  file: 'text-slate-500 dark:text-slate-400',
}

// ---------------------------------------------------------------------------
// Upload Modal
// ---------------------------------------------------------------------------

interface UploadModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  tenantId: string
}

function UploadModal({ open, onClose, onSuccess, tenantId }: UploadModalProps) {
  const addToast = useToast((s) => s.addToast)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<DocumentCategory>('umum')
  const [visibility, setVisibility] = useState<DocumentVisibility>('admin')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = useCallback(() => {
    setTitle('')
    setDescription('')
    setCategory('umum')
    setVisibility('admin')
    setFile(null)
    setUploading(false)
    setDragActive(false)
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [onClose, resetForm])

  const handleFileSelect = useCallback(
    (f: File) => {
      if (f.size > MAX_FILE_SIZE) {
        addToast({ type: 'error', message: 'Ukuran file melebihi batas 10MB' })
        return
      }
      setFile(f)
      // Auto-fill judul dari nama file jika kosong
      setTitle((prev) => prev || f.name.replace(/\.[^.]+$/, ''))
    },
    [addToast]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const f = e.dataTransfer.files[0]
      if (f) handleFileSelect(f)
    },
    [handleFileSelect]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) handleFileSelect(f)
    },
    [handleFileSelect]
  )

  const handleSubmit = useCallback(async () => {
    if (!file || !title.trim()) {
      addToast({ type: 'error', message: 'Judul dan file wajib diisi' })
      return
    }

    setUploading(true)
    try {
      await documentApi.uploadDocument(file, {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        visibility,
        tenantId,
      })
      addToast({ type: 'success', message: 'Dokumen berhasil diunggah' })
      handleClose()
      onSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengunggah dokumen'
      addToast({ type: 'error', message: msg })
    } finally {
      setUploading(false)
    }
  }, [file, title, description, category, visibility, addToast, handleClose, onSuccess, tenantId])

  return (
    <Modal open={open} onClose={handleClose} size="lg">
      <ModalHeader title="Unggah Dokumen" onClose={handleClose} />
      <ModalBody>
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
              dragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500',
              file && 'border-green-500 bg-green-50 dark:bg-green-900/20'
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleInputChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-green-600 dark:text-green-400" />
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                  }}
                  className="ml-2 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Seret file ke sini atau klik untuk memilih
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  PDF, Word, Excel, Gambar (maks. 10MB)
                </p>
              </>
            )}
          </div>

          {/* Judul */}
          <Input
            label="Judul Dokumen"
            placeholder="Masukkan judul dokumen"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Deskripsi */}
          <div className="w-full">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Deskripsi (opsional)
            </label>
            <textarea
              rows={2}
              className={cn(
                'w-full text-sm px-4 py-2.5 rounded-xl border transition-colors',
                'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
                'text-slate-900 dark:text-slate-100',
                'focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none',
                'placeholder:text-slate-400 dark:placeholder:text-slate-500',
                'resize-none'
              )}
              placeholder="Deskripsi singkat dokumen"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Kategori & Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Kategori"
              options={CATEGORY_UPLOAD_OPTIONS}
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            />
            <Select
              label="Visibilitas"
              options={VISIBILITY_OPTIONS}
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as DocumentVisibility)}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose} disabled={uploading}>
          Batal
        </Button>
        <Button
          onClick={handleSubmit}
          loading={uploading}
          disabled={!file || !title.trim() || uploading}
          icon={<Upload className="w-4 h-4" />}
        >
          Unggah
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Category Card
// ---------------------------------------------------------------------------

interface CategoryCardProps {
  category: DocumentCategory
  count: number
  active: boolean
  onClick: () => void
}

function CategoryCard({ category, count, active, onClick }: CategoryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left w-full',
        active
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600'
      )}
    >
      <FolderOpen
        className={cn(
          'w-5 h-5 shrink-0',
          active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm font-medium truncate',
            active ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'
          )}
        >
          {CATEGORY_LABELS[category]}
        </p>
      </div>
      <span
        className={cn(
          'text-xs font-semibold px-2 py-0.5 rounded-full',
          active
            ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
        )}
      >
        {count}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Document Row
// ---------------------------------------------------------------------------

interface DocumentRowProps {
  doc: SchoolDocument
  onDelete: (id: string) => void
}

function DocumentRow({ doc, onDelete }: DocumentRowProps) {
  const iconType = getFileIcon(doc.file_type)

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      {/* Icon */}
      <div className="shrink-0">
        <FileText className={cn('w-5 h-5', FILE_ICON_COLORS[iconType])} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
          {doc.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {CATEGORY_LABELS[doc.category]}
          </span>
          <span className="text-xs text-slate-300 dark:text-slate-600">&middot;</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatFileSize(doc.file_size)}
          </span>
          <span className="text-xs text-slate-300 dark:text-slate-600">&middot;</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            <Eye className="w-3 h-3 inline mr-0.5" />
            {VISIBILITY_OPTIONS.find((v) => v.value === doc.visibility)?.label ?? doc.visibility}
          </span>
        </div>
      </div>

      {/* Date */}
      <span className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {formatRelativeDate(doc.created_at)}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {doc.file_url && (
          <a
            href={sanitizeUrl(doc.file_url)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Unduh"
          >
            <Download className="w-4 h-4" />
            <span className="sr-only">(buka di tab baru)</span>
          </a>
        )}
        <button
          type="button"
          onClick={() => onDelete(doc.id)}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title="Hapus"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function DocumentManager() {
  usePageTitle('Manajemen Dokumen')

  const { hasRole, tenantId } = useAuth()
  const addToast = useToast((s) => s.addToast)

  // State
  const [documents, setDocuments] = useState<SchoolDocument[]>([])
  const [categoryCounts, setCategoryCounts] = useState<Record<DocumentCategory, number>>({
    surat_masuk: 0,
    surat_keluar: 0,
    sk: 0,
    pengumuman: 0,
    rapor: 0,
    umum: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<DocumentFilter>({ category: 'all' })
  const [searchInput, setSearchInput] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  // FIXED: Replace window.confirm with state-based confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const canManage = hasRole('admin') || hasRole('teacher')

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [docs, counts] = await Promise.all([
        documentApi.getDocuments(filter),
        // FIXED: Pass tenantId to getCategoryCounts to prevent cross-tenant count leakage
        documentApi.getCategoryCounts(tenantId ?? undefined),
      ])
      setDocuments(docs)
      setCategoryCounts(counts)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data'
      addToast({ type: 'error', message: msg })
    } finally {
      setLoading(false)
    }
  }, [filter, addToast, tenantId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilter((prev) => ({ ...prev, search: searchInput || undefined }))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  // FIXED: Delete handler — uses state-based confirmation modal instead of window.confirm
  const handleDelete = useCallback((id: string) => {
    setDeleteTarget(id)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await documentApi.deleteDocument(deleteTarget)
      addToast({ type: 'success', message: 'Dokumen berhasil dihapus' })
      void fetchData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus dokumen'
      addToast({ type: 'error', message: msg })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }, [deleteTarget, addToast, fetchData])

  // Category filter click
  const handleCategoryClick = useCallback((cat: DocumentCategory) => {
    setFilter((prev) => ({
      ...prev,
      category: prev.category === cat ? 'all' : cat,
    }))
  }, [])

  const totalDocs = Object.values(categoryCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Surat & Dokumen
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {totalDocs} dokumen tersimpan
          </p>
        </div>
        {canManage && (
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowUpload(true)}>
            Unggah Dokumen
          </Button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Cari dokumen..."
            icon={<Search className="w-4 h-4" />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={CATEGORY_OPTIONS}
            value={filter.category || 'all'}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                category: e.target.value as DocumentCategory | 'all',
              }))
            }
          />
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {(Object.keys(CATEGORY_LABELS) as DocumentCategory[]).map((cat) => (
          <CategoryCard
            key={cat}
            category={cat}
            count={categoryCounts[cat]}
            active={filter.category === cat}
            onClick={() => handleCategoryClick(cat)}
          />
        ))}
      </div>

      {/* Document List */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {filter.category && filter.category !== 'all'
              ? CATEGORY_LABELS[filter.category as DocumentCategory]
              : 'Semua Dokumen'}
            {filter.search && (
              <span className="font-normal text-slate-400 dark:text-slate-500">
                {' '}
                &middot; Pencarian: &ldquo;{filter.search}&rdquo;
              </span>
            )}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
              Memuat dokumen...
            </span>
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="w-12 h-12" />}
            title="Belum ada dokumen"
            description={
              filter.search
                ? `Tidak ditemukan dokumen dengan kata kunci "${filter.search}"`
                : 'Mulai unggah dokumen sekolah untuk mengelola arsip digital.'
            }
            action={
              canManage
                ? { label: 'Unggah Dokumen', onClick: () => setShowUpload(true) }
                : undefined
            }
          />
        ) : (
          <div>
            {documents.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={fetchData}
        tenantId={tenantId!}
      />

      {/* FIXED: State-based Delete Confirmation Modal (replaces window.confirm) */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="sm">
        <ModalHeader title="Konfirmasi Hapus" onClose={() => setDeleteTarget(null)} />
        <ModalBody>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Yakin ingin menghapus dokumen ini? Tindakan ini tidak dapat dibatalkan dan file akan
              dihapus permanen dari server.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Batal
          </Button>
          <Button
            onClick={confirmDelete}
            loading={deleting}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white"
            icon={<Trash2 className="w-4 h-4" />}
          >
            Hapus Permanen
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
