/**
 * PageLoadingFallback — full-page skeleton loading component used as Suspense fallback.
 * Variants mimic the layout of the page being loaded to avoid layout shift.
 */

import { SkeletonCard } from './ui/Skeleton'
import { Spinner } from './ui/Spinner'

interface PageLoadingFallbackProps {
  variant?: 'dashboard' | 'table' | 'form' | 'default'
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`} />
}

function DefaultFallback() {
  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <Spinner size="sm" className="mx-auto" />
      <SkeletonBlock className="h-8 w-48" />
      <div className="space-y-4">
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-5/6" />
        <SkeletonBlock className="h-4 w-4/6" />
      </div>
      <SkeletonCard lines={3} />
      <SkeletonCard lines={2} />
    </div>
  )
}

function DashboardFallback() {
  return (
    <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <Spinner size="sm" className="mx-auto" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-9 w-32" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-3"
          >
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-8 w-8 rounded-xl" />
            </div>
            <SkeletonBlock className="h-8 w-16" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Content row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
          <SkeletonBlock className="h-5 w-40" />
          <SkeletonBlock className="h-56 w-full rounded-xl" />
        </div>

        {/* Sidebar content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-3">
          <SkeletonBlock className="h-5 w-32 mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <SkeletonBlock className="h-9 w-9 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <SkeletonBlock className="h-3.5 w-3/4" />
                <SkeletonBlock className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TableFallback() {
  return (
    <div className="space-y-4 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <Spinner size="sm" className="mx-auto" />
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-8 w-40" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-9 w-28" />
          <SkeletonBlock className="h-9 w-28" />
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3">
        <SkeletonBlock className="h-10 w-72" />
        <SkeletonBlock className="h-10 w-32" />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          {[180, 120, 120, 90, 90].map((w, i) => (
            <SkeletonBlock key={i} className={`h-4 w-[${w}px]`} />
          ))}
        </div>

        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0"
          >
            <SkeletonBlock className="h-4 w-44" />
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-6 w-20 rounded-full" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

function FormFallback() {
  return (
    <div className="space-y-6 p-4 md:p-8 max-w-2xl mx-auto w-full">
      <Spinner size="sm" className="mx-auto" />
      {/* Page title */}
      <SkeletonBlock className="h-8 w-56" />

      {/* Form card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        {/* Field 1 */}
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-10 w-full rounded-xl" />
        </div>

        {/* Field 2 */}
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-10 w-full rounded-xl" />
        </div>

        {/* Field 3 — textarea */}
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-28 w-full rounded-xl" />
        </div>

        {/* Submit button */}
        <div className="flex justify-end pt-2">
          <SkeletonBlock className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function PageLoadingFallback({ variant = 'default' }: PageLoadingFallbackProps) {
  switch (variant) {
    case 'dashboard':
      return <DashboardFallback />
    case 'table':
      return <TableFallback />
    case 'form':
      return <FormFallback />
    default:
      return <DefaultFallback />
  }
}
