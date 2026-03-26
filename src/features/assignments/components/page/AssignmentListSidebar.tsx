import { Clock, FileText, Filter, Search, Users } from 'lucide-react'

import type { Tab } from '@/src/components/ui'
import { EmptyState, Tabs } from '@/src/components/ui'
import type { AssignmentUiState } from '@/src/features/assignments/types'
import { cn } from '@/src/utils/cn'

import { getStatusBadge } from './assignmentPageUtils'

interface AssignmentListSidebarProps {
  assignments: AssignmentUiState[]
  filteredAssignments: AssignmentUiState[]
  searchTerm: string
  filter: string
  typeFilter: string
  selectedAssignment: string | null
  onSearchChange: (term: string) => void
  onFilterChange: (filter: string) => void
  onTypeFilterChange: (type: string) => void
  onSelectAssignment: (id: string) => void
}

export function AssignmentListSidebar({
  assignments,
  filteredAssignments,
  searchTerm,
  filter,
  typeFilter,
  selectedAssignment,
  onSearchChange,
  onFilterChange,
  onTypeFilterChange,
  onSelectAssignment,
}: AssignmentListSidebarProps) {
  const statusTabs: Tab[] = [
    { id: 'all', label: 'Semua', count: assignments.length },
    {
      id: 'assigned',
      label: 'Aktif',
      count: assignments.filter((a) => a.status === 'assigned' || a.status === 'late').length,
    },
    {
      id: 'submitted',
      label: 'Dikumpulkan',
      count: assignments.filter(
        (a) => a.status === 'submitted' || (a.status as string) === 'turned_in'
      ).length,
    },
    {
      id: 'graded',
      label: 'Dinilai',
      count: assignments.filter((a) => a.status === 'graded' || (a.status as string) === 'returned')
        .length,
    },
  ]

  return (
    <div className="lg:col-span-1 space-y-4">
      {/* Search & Filter */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              aria-label="Cari tugas"
              placeholder="Cari tugas..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white"
            />
          </div>
        </div>
        <div className="space-y-3">
          <Tabs tabs={statusTabs} activeTab={filter} onChange={onFilterChange} className="w-full" />
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Filter className="w-4 h-4" />
            </div>
            <select
              aria-label="Filter berdasarkan jenis tugas"
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-slate-700 dark:text-slate-300 appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <option value="all">Semua Jenis</option>
              <option value="individual">Individu</option>
              <option value="group">Kelompok</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg
                className="w-4 h-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment List */}
      <div className="space-y-3">
        {filteredAssignments.map((assignment) => (
          <button
            key={assignment.id}
            onClick={() => onSelectAssignment(assignment.id)}
            className={cn(
              'w-full text-left p-4 rounded-2xl border transition-all duration-200',
              selectedAssignment === assignment.id
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm ring-1 ring-blue-100 dark:ring-blue-900'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
            )}
          >
            <div className="flex justify-between items-start mb-2">
              <h3
                className={cn(
                  'font-bold text-sm line-clamp-2 pr-2 flex items-center gap-2',
                  selectedAssignment === assignment.id
                    ? 'text-blue-900 dark:text-blue-300'
                    : 'text-slate-800 dark:text-slate-200'
                )}
              >
                {assignment.type === 'group' ? (
                  <Users className="w-4 h-4 text-indigo-500 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                )}
                {assignment.title}
              </h3>
              <div className="shrink-0">{getStatusBadge(assignment.status)}</div>
            </div>
            <div
              className={cn(
                'flex items-center gap-2 text-xs font-medium',
                new Date(assignment.dueDate) < new Date() &&
                  assignment.status !== 'submitted' &&
                  assignment.status !== 'graded'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              Tenggat:{' '}
              {new Date(assignment.dueDate).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {new Date(assignment.dueDate) < new Date() &&
                assignment.status !== 'submitted' &&
                assignment.status !== 'graded' && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-bold rounded-full">
                    LATE
                  </span>
                )}
            </div>
          </button>
        ))}
        {filteredAssignments.length === 0 && (
          <EmptyState
            icon={<FileText className="w-12 h-12" />}
            title="Tidak ada tugas ditemukan"
            description="Coba ubah filter atau buat tugas baru."
          />
        )}
      </div>
    </div>
  )
}
