/**
 * PPDBDashboard.tsx — Dasbor PPDB Online Admin EduSync.
 *
 * Sections:
 *  1. Header + Period Selector
 *  2. Summary Cards        — extracted to PPDBSummaryCards
 *  3. Registrations Table  — extracted to PPDBRegistrationTable
 *  4. Bulk Actions         — terima/tolak dipilih, ekspor CSV, umumkan hasil
 *  5. Modals               — extracted to PPDBDetailModal, PPDBPeriodModal, PPDBAddRegModal
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Download,
  GraduationCap,
  Loader2,
  Megaphone,
  Plus,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { cn } from '@/utils/cn'

import {
  bulkUpdateRegistrationStatus,
  createPPDBPeriod,
  fetchPPDBPeriods,
  fetchPPDBSummary,
  fetchRegistrations,
  updatePeriodStatus,
  updateRegistrationStatus,
} from '../api/ppdbApi'
import type {
  PPDBPeriodInput,
  PPDBPeriodStatus,
  PPDBRegistration,
  PPDBRegistrationFilter,
  PPDBRegistrationStatus,
  PPDBStatusFilter,
  PPDBSummary,
} from '../types/ppdb'
import { exportPPDBToCSV } from '../utils/ppdbExport'
import { PPDBAddRegModal } from './ppdb/PPDBAddRegModal'
import { PPDBDetailModal } from './ppdb/PPDBDetailModal'
import { PPDBPeriodModal } from './ppdb/PPDBPeriodModal'
import { PPDBRegistrationTable } from './ppdb/PPDBRegistrationTable'
import { PPDBSummaryCards } from './ppdb/PPDBSummaryCards'

const PAGE_SIZE = 10

const PERIOD_STATUS_LABELS: Record<PPDBPeriodStatus, string> = {
  draft: 'Draf',
  open: 'Dibuka',
  closed: 'Ditutup',
  announced: 'Diumumkan',
}

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

export function PPDBDashboard() {
  const queryClient = useQueryClient()

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

  const periodsQuery = useQuery({
    queryKey: ['ppdb', 'periods'],
    queryFn: fetchPPDBPeriods,
    staleTime: 60_000,
  })

  const periods = periodsQuery.data ?? []

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

      {selectedPeriod && (
        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
          <PeriodStatusBadge status={selectedPeriod.status} />
          <span>
            {formatDate(selectedPeriod.start_date)} — {formatDate(selectedPeriod.end_date)}
          </span>
          <span>Kuota: {selectedPeriod.quota}</span>

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

      {selectedPeriodId && <PPDBSummaryCards summary={summary} loading={summaryQuery.isLoading} />}

      {selectedPeriodId && (
        <PPDBRegistrationTable
          registrations={registrations}
          totalCount={totalCount}
          totalPages={totalPages}
          filter={filter}
          searchInput={searchInput}
          selectedIds={selectedIds}
          isLoading={registrationsQuery.isLoading}
          onSearch={handleSearch}
          onSearchInputChange={setSearchInput}
          onStatusFilterChange={handleStatusFilterChange}
          onSelectAll={handleSelectAll}
          onSelectOne={handleSelectOne}
          onViewDetail={setDetailReg}
          onAddRegistration={() => setAddRegModalOpen(true)}
          onPageChange={(page) => setFilter((f) => ({ ...f, page }))}
        />
      )}

      {selectedPeriodId && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Aksi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

      {periodsQuery.isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      {detailReg && (
        <PPDBDetailModal
          registration={detailReg}
          onClose={() => setDetailReg(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {periodModalOpen && (
        <PPDBPeriodModal onClose={() => setPeriodModalOpen(false)} onSave={handleCreatePeriod} />
      )}

      {addRegModalOpen && selectedPeriodId && (
        <PPDBAddRegModal
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
