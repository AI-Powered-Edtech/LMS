import { ArrowLeft, LayoutDashboard } from 'lucide-react'
import { useState } from 'react'

import type { DashboardConfig } from '@/features/dashboards'
import { DashboardBuilder, DashboardList, DashboardViewer } from '@/features/dashboards'
import { usePageTitle } from '@/hooks/usePageTitle'

type View = 'list' | 'create' | 'edit' | 'view'

export function Dashboards() {
  usePageTitle('Dasbor')
  const [view, setView] = useState<View>('list')
  const [selectedDashboard, setSelectedDashboard] = useState<DashboardConfig | null>(null)

  const handleCreate = () => {
    setSelectedDashboard(null)
    setView('create')
  }

  const handleEdit = (dashboard: DashboardConfig) => {
    setSelectedDashboard(dashboard)
    setView('edit')
  }

  const handleView = (dashboard: DashboardConfig) => {
    setSelectedDashboard(dashboard)
    setView('view')
  }

  const handleBack = () => {
    setView('list')
    setSelectedDashboard(null)
  }

  return (
    <div className="flex flex-col flex-1 w-full h-full overflow-y-auto custom-scrollbar scroll-smooth bg-slate-50/50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {view !== 'list' && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <LayoutDashboard className="h-7 w-7 text-indigo-500" />
              {view === 'list' && 'Dashboard Kustom'}
              {view === 'create' && 'Buat Dashboard Baru'}
              {view === 'edit' && `Edit: ${selectedDashboard?.name}`}
              {view === 'view' && selectedDashboard?.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {view === 'list' && 'Kelola tampilan analitik kustom untuk kelasmu'}
              {view === 'create' && 'Susun widget analitik sesuai kebutuhanmu'}
              {view === 'edit' && 'Edit konfigurasi dashboard'}
              {view === 'view' && (selectedDashboard?.description ?? '')}
            </p>
          </div>
        </div>

        {/* Content */}
        {view === 'list' && (
          <DashboardList onCreate={handleCreate} onEdit={handleEdit} onView={handleView} />
        )}

        {(view === 'create' || view === 'edit') && (
          <DashboardBuilder
            initialDashboard={view === 'edit' ? selectedDashboard : null}
            onSaved={() => setView('list')}
          />
        )}

        {view === 'view' && selectedDashboard && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => handleEdit(selectedDashboard)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                Edit Dashboard
              </button>
            </div>
            <DashboardViewer dashboard={selectedDashboard} />
          </div>
        )}
      </div>
    </div>
  )
}
