import { Eye, FileText, Search, UserPlus } from 'lucide-react'

import { cn } from '@/utils/cn'

import type {
  PPDBRegistration,
  PPDBRegistrationFilter,
  PPDBRegistrationStatus,
  PPDBStatusFilter,
} from '../../types/ppdb'

const STATUS_OPTIONS: { value: PPDBStatusFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'reviewed', label: 'Direview' },
  { value: 'accepted', label: 'Diterima' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'waitlisted', label: 'Cadangan' },
]

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

interface PPDBRegistrationTableProps {
  registrations: PPDBRegistration[]
  totalCount: number
  totalPages: number
  filter: PPDBRegistrationFilter
  searchInput: string
  selectedIds: Set<string>
  isLoading: boolean
  onSearch: () => void
  onSearchInputChange: (value: string) => void
  onStatusFilterChange: (status: PPDBStatusFilter) => void
  onSelectAll: (checked: boolean) => void
  onSelectOne: (id: string, checked: boolean) => void
  onViewDetail: (reg: PPDBRegistration) => void
  onAddRegistration: () => void
  onPageChange: (page: number) => void
}

export function PPDBRegistrationTable({
  registrations,
  totalCount,
  totalPages,
  filter,
  searchInput,
  selectedIds,
  isLoading,
  onSearch,
  onSearchInputChange,
  onStatusFilterChange,
  onSelectAll,
  onSelectOne,
  onViewDetail,
  onAddRegistration,
  onPageChange,
}: PPDBRegistrationTableProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
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

        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onStatusFilterChange(value)}
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

      <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama siswa, no. pendaftaran..."
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
          />
        </div>
        <button
          onClick={onSearch}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          Cari
        </button>
        <button
          onClick={onAddRegistration}
          className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={registrations.length > 0 && selectedIds.size === registrations.length}
                  onChange={(e) => onSelectAll(e.target.checked)}
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
            {isLoading ? (
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
                      onChange={(e) => onSelectOne(reg.id, e.target.checked)}
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
                    <p className="text-xs text-slate-400 dark:text-slate-500">{reg.parent_phone}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <RegistrationStatusBadge status={reg.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onViewDetail(reg)}
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

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Halaman {filter.page} dari {totalPages} ({totalCount} data)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, filter.page - 1))}
              disabled={filter.page <= 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, filter.page + 1))}
              disabled={filter.page >= totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
