/**
 * PPDBDashboard.tsx — Dasbor PPDB Online Admin EduSync.
 *
 * Sections:
 *  1. Header + Period Selector
 *  2. Summary Cards        — total, kuota, diterima, ditolak, menunggu
 *  3. Registrations Table  — search, filter, pagination, checkbox select
 *  4. Bulk Actions         — terima/tolak dipilih, ekspor CSV, umumkan hasil
 *  5. Detail Modal         — lihat detail pendaftar, ubah status, tambah catatan
 *  6. Period Modal         — buat/edit periode
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Loader2,
  Megaphone,
  Plus,
  Search,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { cn } from '@/utils/cn'

import {
  bulkUpdateRegistrationStatus,
  createPPDBPeriod,
  createRegistration,
  fetchPPDBPeriods,
  fetchPPDBSummary,
  fetchRegistrations,
  updatePeriodStatus,
  updateRegistrationStatus,
} from '../api/ppdbApi'
import type {
  PPDBPeriod,
  PPDBPeriodInput,
  PPDBPeriodStatus,
  PPDBRegistration,
  PPDBRegistrationFilter,
  PPDBRegistrationStatus,
  PPDBStatusFilter,
  PPDBSummary,
} from '../types/ppdb'
import { exportPPDBToCSV } from '../utils/ppdbExport'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10

const STATUS_OPTIONS: { value: PPDBStatusFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'reviewed', label: 'Direview' },
  { value: 'accepted', label: 'Diterima' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'waitlisted', label: 'Cadangan' },
]

const PERIOD_STATUS_LABELS: Record<PPDBPeriodStatus, string> = {
  draft: 'Draf',
  open: 'Dibuka',
  closed: 'Ditutup',
  announced: 'Diumumkan',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ID_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const wibOffset = 7 * 60
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60_000
  const wib = new Date(utcMs + wibOffset * 60_000)
  return `${String(wib.getDate()).padStart(2, '0')} ${ID_MONTHS[wib.getMonth()]} ${wib.getFullYear()}`
}

function translateGender(g: string): string {
  return g === 'L' ? 'Laki-laki' : 'Perempuan'
}

// ---------------------------------------------------------------------------
// Status Badge
// ---------------------------------------------------------------------------

function RegistrationStatusBadge({ status }: { status: PPDBRegistrationStatus }) {
  const config: Record<PPDBRegistrationStatus, { label: string; cls: string }> = {
    pending: {
      label: 'Menunggu',
      cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    reviewed: {
      label: 'Direview',
      cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    accepted: {
      label: 'Diterima',
      cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    rejected: {
      label: 'Ditolak',
      cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
    waitlisted: {
      label: 'Cadangan',
      cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    },
  }

  const c = config[status] ?? config.pending
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
        c.cls
      )}
    >
      {c.label}
    </span>
  )
}

function PeriodStatusBadge({ status }: { status: PPDBPeriodStatus }) {
  const config: Record<PPDBPeriodStatus, string> = {
    draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
    open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    closed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    announced: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
        config[status]
      )}
    >
      {PERIOD_STATUS_LABELS[status]}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Overview Card
// ---------------------------------------------------------------------------

interface OverviewCardProps {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string | number
  subLabel?: string
  loading?: boolean
}

function OverviewCard({ icon, iconBg, label, value, subLabel, loading }: OverviewCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex items-start gap-4 shadow-sm">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">
          {label}
        </p>
        {loading ? (
          <div className="h-7 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
            {value}
          </p>
        )}
        {subLabel && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{subLabel}</p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton baris tabel
// ---------------------------------------------------------------------------

function TableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-700">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyRegistrations() {
  return (
    <tr>
      <td colSpan={7} className="text-center py-16">
        <div className="flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
          <UserPlus className="w-12 h-12 opacity-40" />
          <p className="font-medium text-slate-600 dark:text-slate-400">Belum ada pendaftar</p>
          <p className="text-sm">Data pendaftar akan muncul di sini setelah ada yang mendaftar.</p>
        </div>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Detail Modal
// ---------------------------------------------------------------------------

interface DetailModalProps {
  registration: PPDBRegistration
  onClose: () => void
  onStatusChange: (id: string, status: PPDBRegistrationStatus, notes?: string) => Promise<void>
}

function DetailModal({ registration, onClose, onStatusChange }: DetailModalProps) {
  const [status, setStatus] = useState<PPDBRegistrationStatus>(registration.status)
  const [notes, setNotes] = useState(registration.notes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onStatusChange(registration.id, status, notes)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const docs = registration.documents ?? {}
  const docEntries = Object.entries(docs).filter(([, v]) => v)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Detail Pendaftar
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {registration.registration_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Data Siswa */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Data Calon Siswa
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Nama</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {registration.student_name}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Tanggal Lahir</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {formatDate(registration.birth_date)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Jenis Kelamin</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {translateGender(registration.gender)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Asal Sekolah</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {registration.previous_school || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Data Orang Tua */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Data Orang Tua/Wali
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Nama</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {registration.parent_name}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Telepon</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {registration.parent_phone}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Email</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {registration.parent_email || '—'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Alamat</p>
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  {registration.address || '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Dokumen */}
          {docEntries.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Dokumen
              </h3>
              <div className="space-y-2">
                {docEntries.map(([key, url]) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <FileText className="w-4 h-4" />
                    {key}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Update Status */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Perbarui Status
            </h3>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PPDBRegistrationStatus)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            >
              <option value="pending">Menunggu</option>
              <option value="reviewed">Direview</option>
              <option value="accepted">Diterima</option>
              <option value="rejected">Ditolak</option>
              <option value="waitlisted">Cadangan</option>
            </select>
          </div>

          {/* Catatan */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Catatan
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Tambahkan catatan..."
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-slate-800 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Period Modal
// ---------------------------------------------------------------------------

interface PeriodModalProps {
  period?: PPDBPeriod | null
  onClose: () => void
  onSave: (input: PPDBPeriodInput) => Promise<void>
}

function PeriodModal({ period, onClose, onSave }: PeriodModalProps) {
  const [form, setForm] = useState<PPDBPeriodInput>({
    academic_year:
      period?.academic_year ?? `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    name: period?.name ?? '',
    start_date: period?.start_date ?? '',
    end_date: period?.end_date ?? '',
    quota: period?.quota ?? 100,
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {period ? 'Edit Periode' : 'Buat Periode Baru'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tahun Ajaran
            </label>
            <input
              type="text"
              value={form.academic_year}
              onChange={(e) => setForm((f) => ({ ...f, academic_year: e.target.value }))}
              placeholder="2026/2027"
              required
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nama Gelombang
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Gelombang 1"
              required
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Selesai
              </label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Kuota Penerimaan
            </label>
            <input
              type="number"
              value={form.quota}
              onChange={(e) => setForm((f) => ({ ...f, quota: parseInt(e.target.value) || 0 }))}
              min={1}
              required
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {period ? 'Simpan' : 'Buat Periode'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add Registration Modal
// ---------------------------------------------------------------------------

interface AddRegistrationModalProps {
  periodId: string
  onClose: () => void
  onSaved: () => void
}

function AddRegistrationModal({ periodId, onClose, onSaved }: AddRegistrationModalProps) {
  const [form, setForm] = useState({
    student_name: '',
    birth_date: '',
    gender: 'L' as 'L' | 'P',
    previous_school: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    address: '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await createRegistration(periodId, form)
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Tambah Pendaftar</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Nama Siswa
              </label>
              <input
                type="text"
                value={form.student_name}
                onChange={(e) => setForm((f) => ({ ...f, student_name: e.target.value }))}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Jenis Kelamin
              </label>
              <select
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value as 'L' | 'P' }))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Asal Sekolah
              </label>
              <input
                type="text"
                value={form.previous_school}
                onChange={(e) => setForm((f) => ({ ...f, previous_school: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Data Orang Tua/Wali
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nama Orang Tua
                </label>
                <input
                  type="text"
                  value={form.parent_name}
                  onChange={(e) => setForm((f) => ({ ...f, parent_name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Telepon
                </label>
                <input
                  type="tel"
                  value={form.parent_phone}
                  onChange={(e) => setForm((f) => ({ ...f, parent_phone: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.parent_email}
                  onChange={(e) => setForm((f) => ({ ...f, parent_email: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Alamat
                </label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Tambah Pendaftar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Confirm Dialog
// ---------------------------------------------------------------------------

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  confirmClass?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
  loading,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2',
              confirmClass ?? 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function PPDBDashboard() {
  const queryClient = useQueryClient()

  // ─── State ──────────────────────────────────────────────────────────────────
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [filter, setFilter] = useState<PPDBRegistrationFilter>({
    status: 'all',
    search: '',
    page: 1,
    pageSize: PAGE_SIZE,
  })
  const [searchInput, setSearchInput] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [detailReg, setDetailReg] = useState<PPDBRegistration | null>(null)
  const [periodModalOpen, setPeriodModalOpen] = useState(false)
  const [addRegModalOpen, setAddRegModalOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'bulk-accept' | 'bulk-reject' | 'announce'
  } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false)

  // ─── Queries ────────────────────────────────────────────────────────────────
  const periodsQuery = useQuery({
    queryKey: ['ppdb', 'periods'],
    queryFn: fetchPPDBPeriods,
    staleTime: 60_000,
  })

  const periods = periodsQuery.data ?? []

  // Auto-select first period
  useEffect(() => {
    if (!selectedPeriodId && periods.length > 0) {
      setSelectedPeriodId(periods[0].id)
    }
  }, [periods, selectedPeriodId])

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === selectedPeriodId) ?? null,
    [periods, selectedPeriodId]
  )

  const registrationsQuery = useQuery({
    queryKey: ['ppdb', 'registrations', selectedPeriodId, filter],
    queryFn: () =>
      selectedPeriodId
        ? fetchRegistrations(selectedPeriodId, filter)
        : Promise.resolve({ data: [], count: 0 }),
    enabled: !!selectedPeriodId,
    placeholderData: (prev) => prev,
  })

  const summaryQuery = useQuery({
    queryKey: ['ppdb', 'summary', selectedPeriodId],
    queryFn: () =>
      selectedPeriodId
        ? fetchPPDBSummary(selectedPeriodId)
        : Promise.resolve({
            total: 0,
            quota: 0,
            accepted: 0,
            rejected: 0,
            pending: 0,
            reviewed: 0,
            waitlisted: 0,
          } as PPDBSummary),
    enabled: !!selectedPeriodId,
    staleTime: 30_000,
  })

  const registrations = registrationsQuery.data?.data ?? []
  const totalCount = registrationsQuery.data?.count ?? 0
  const summary = summaryQuery.data ?? {
    total: 0,
    quota: 0,
    accepted: 0,
    rejected: 0,
    pending: 0,
    reviewed: 0,
    waitlisted: 0,
  }
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['ppdb'] })
    setSelectedIds(new Set())
  }

  function handleSearch() {
    setFilter((f) => ({ ...f, search: searchInput, page: 1 }))
  }

  function handleStatusFilterChange(status: PPDBStatusFilter) {
    setFilter((f) => ({ ...f, status, page: 1 }))
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(registrations.map((r) => r.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  function handleSelectOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const handleStatusChange = useCallback(
    async (id: string, status: PPDBRegistrationStatus, notes?: string) => {
      await updateRegistrationStatus(id, status, notes)
      invalidateAll()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  async function handleBulkAction(status: PPDBRegistrationStatus) {
    if (selectedIds.size === 0) return
    setActionLoading(true)
    try {
      await bulkUpdateRegistrationStatus(Array.from(selectedIds), status)
      invalidateAll()
    } finally {
      setActionLoading(false)
      setConfirmAction(null)
    }
  }

  async function handleAnnounce() {
    if (!selectedPeriodId) return
    setActionLoading(true)
    try {
      await updatePeriodStatus(selectedPeriodId, 'announced')
      invalidateAll()
    } finally {
      setActionLoading(false)
      setConfirmAction(null)
    }
  }

  async function handleCreatePeriod(input: PPDBPeriodInput) {
    await createPPDBPeriod(input)
    invalidateAll()
  }

  function handleExportCSV() {
    if (registrations.length === 0) return
    exportPPDBToCSV(registrations)
  }

  function handlePeriodSelect(id: string) {
    setSelectedPeriodId(id)
    setFilter((f) => ({ ...f, page: 1, search: '', status: 'all' }))
    setSearchInput('')
    setSelectedIds(new Set())
    setPeriodDropdownOpen(false)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">PPDB Online</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Penerimaan Peserta Didik Baru
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="relative">
            <button
              onClick={() => setPeriodDropdownOpen((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-w-[200px]"
            >
              {selectedPeriod ? (
                <span className="flex-1 text-left truncate">
                  {selectedPeriod.academic_year} — {selectedPeriod.name}
                </span>
              ) : (
                <span className="flex-1 text-left text-slate-400">Pilih Periode</span>
              )}
              <ChevronDown className="w-4 h-4 shrink-0" />
            </button>

            {periodDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  role="presentation"
                  onClick={() => setPeriodDropdownOpen(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setPeriodDropdownOpen(false)
                  }}
                />
                <div className="absolute right-0 mt-1 w-72 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                  {periods.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      Belum ada periode. Buat periode baru.
                    </p>
                  ) : (
                    periods.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handlePeriodSelect(p.id)}
                        className={cn(
                          'w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between gap-2',
                          p.id === selectedPeriodId && 'bg-blue-50 dark:bg-blue-900/20'
                        )}
                      >
                        <span className="truncate">
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {p.academic_year}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400"> — {p.name}</span>
                        </span>
                        <PeriodStatusBadge status={p.status} />
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => setPeriodModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Buat Periode</span>
          </button>
        </div>
      </div>

      {/* Period status info */}
      {selectedPeriod && (
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
          <PeriodStatusBadge status={selectedPeriod.status} />
          <span>
            {formatDate(selectedPeriod.start_date)} — {formatDate(selectedPeriod.end_date)}
          </span>
          <span>Kuota: {selectedPeriod.quota}</span>

          {/* Period status actions */}
          {selectedPeriod.status === 'draft' && (
            <button
              onClick={async () => {
                await updatePeriodStatus(selectedPeriod.id, 'open')
                invalidateAll()
              }}
              className="ml-auto px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Buka Pendaftaran
            </button>
          )}
          {selectedPeriod.status === 'open' && (
            <button
              onClick={async () => {
                await updatePeriodStatus(selectedPeriod.id, 'closed')
                invalidateAll()
              }}
              className="ml-auto px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Tutup Pendaftaran
            </button>
          )}
        </div>
      )}

      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      {selectedPeriodId && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          <OverviewCard
            icon={<Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            label="Total Pendaftar"
            value={summary.total}
            loading={summaryQuery.isLoading}
          />
          <OverviewCard
            icon={<GraduationCap className="w-6 h-6 text-slate-600 dark:text-slate-400" />}
            iconBg="bg-slate-100 dark:bg-slate-700"
            label="Kuota"
            value={summary.quota}
            subLabel={
              summary.total > 0
                ? `${Math.round((summary.accepted / summary.quota) * 100)}% terisi`
                : undefined
            }
            loading={summaryQuery.isLoading}
          />
          <OverviewCard
            icon={<UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            label="Diterima"
            value={summary.accepted}
            loading={summaryQuery.isLoading}
          />
          <OverviewCard
            icon={<UserX className="w-6 h-6 text-red-600 dark:text-red-400" />}
            iconBg="bg-red-100 dark:bg-red-900/30"
            label="Ditolak"
            value={summary.rejected}
            loading={summaryQuery.isLoading}
          />
          <OverviewCard
            icon={<Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            label="Menunggu"
            value={summary.pending + summary.reviewed}
            subLabel={summary.waitlisted > 0 ? `+ ${summary.waitlisted} cadangan` : undefined}
            loading={summaryQuery.isLoading}
          />
        </div>
      )}

      {/* ── Registrations Table ────────────────────────────────────────── */}
      {selectedPeriodId && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Table header + filters */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Daftar Pendaftar</h2>
              {totalCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-full font-medium">
                  {totalCount}
                </span>
              )}
            </div>

            {/* Status filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {STATUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleStatusFilterChange(value)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-medium transition-colors',
                    filter.status === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama siswa, no. pendaftaran..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Cari
            </button>
            <button
              onClick={() => setAddRegModalOpen(true)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Tambah</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={
                        registrations.length > 0 && selectedIds.size === registrations.length
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    No. Daftar
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Nama Siswa
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Asal Sekolah
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Orang Tua
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {registrationsQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)
                ) : registrations.length === 0 ? (
                  <EmptyRegistrations />
                ) : (
                  registrations.map((reg) => (
                    <tr
                      key={reg.id}
                      className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(reg.id)}
                          onChange={(e) => handleSelectOne(reg.id, e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                          {reg.registration_number}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                          {reg.student_name}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {translateGender(reg.gender)} · {formatDate(reg.birth_date)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-[160px] truncate">
                        {reg.previous_school || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                          {reg.parent_name}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {reg.parent_phone}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <RegistrationStatusBadge status={reg.status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setDetailReg(reg)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Halaman {filter.page} dari {totalPages} ({totalCount} data)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilter((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
                  disabled={filter.page <= 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() =>
                    setFilter((f) => ({ ...f, page: Math.min(totalPages, f.page + 1) }))
                  }
                  disabled={filter.page >= totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Bulk Actions ───────────────────────────────────────────────── */}
      {selectedPeriodId && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Aksi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Terima Dipilih */}
            <button
              onClick={() => setConfirmAction({ type: 'bulk-accept' })}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                  Terima Dipilih
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} pendaftar dipilih`
                    : 'Pilih pendaftar terlebih dahulu'}
                </p>
              </div>
            </button>

            {/* Tolak Dipilih */}
            <button
              onClick={() => setConfirmAction({ type: 'bulk-reject' })}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                  Tolak Dipilih
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} pendaftar dipilih`
                    : 'Pilih pendaftar terlebih dahulu'}
                </p>
              </div>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              disabled={registrations.length === 0}
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">Ekspor CSV</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Unduh data pendaftar</p>
              </div>
            </button>

            {/* Umumkan Hasil */}
            <button
              onClick={() => setConfirmAction({ type: 'announce' })}
              disabled={!selectedPeriod || selectedPeriod.status === 'announced'}
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                  Umumkan Hasil
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedPeriod?.status === 'announced'
                    ? 'Sudah diumumkan'
                    : 'Ubah status ke Diumumkan'}
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── No Period Selected ─────────────────────────────────────────── */}
      {!selectedPeriodId && !periodsQuery.isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6">
            <GraduationCap className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Belum Ada Periode PPDB
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mb-6">
            Buat periode pendaftaran baru untuk mulai mengelola PPDB Online.
          </p>
          <button
            onClick={() => setPeriodModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Buat Periode Pertama
          </button>
        </div>
      )}

      {/* ── Loading state ──────────────────────────────────────────────── */}
      {periodsQuery.isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {detailReg && (
        <DetailModal
          registration={detailReg}
          onClose={() => setDetailReg(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {periodModalOpen && (
        <PeriodModal onClose={() => setPeriodModalOpen(false)} onSave={handleCreatePeriod} />
      )}

      {addRegModalOpen && selectedPeriodId && (
        <AddRegistrationModal
          periodId={selectedPeriodId}
          onClose={() => setAddRegModalOpen(false)}
          onSaved={invalidateAll}
        />
      )}

      {confirmAction?.type === 'bulk-accept' && (
        <ConfirmDialog
          title="Terima Pendaftar"
          message={`Anda akan menerima ${selectedIds.size} pendaftar yang dipilih. Lanjutkan?`}
          confirmLabel="Terima"
          confirmClass="bg-emerald-600 hover:bg-emerald-700"
          onConfirm={() => handleBulkAction('accepted')}
          onCancel={() => setConfirmAction(null)}
          loading={actionLoading}
        />
      )}

      {confirmAction?.type === 'bulk-reject' && (
        <ConfirmDialog
          title="Tolak Pendaftar"
          message={`Anda akan menolak ${selectedIds.size} pendaftar yang dipilih. Lanjutkan?`}
          confirmLabel="Tolak"
          confirmClass="bg-red-600 hover:bg-red-700"
          onConfirm={() => handleBulkAction('rejected')}
          onCancel={() => setConfirmAction(null)}
          loading={actionLoading}
        />
      )}

      {confirmAction?.type === 'announce' && (
        <ConfirmDialog
          title="Umumkan Hasil PPDB"
          message="Status periode akan diubah menjadi 'Diumumkan'. Pastikan semua pendaftar sudah diproses. Lanjutkan?"
          confirmLabel="Umumkan"
          confirmClass="bg-purple-600 hover:bg-purple-700"
          onConfirm={handleAnnounce}
          onCancel={() => setConfirmAction(null)}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
