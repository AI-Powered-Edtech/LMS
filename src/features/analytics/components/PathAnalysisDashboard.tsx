import { GitBranch, Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'

import { cn } from '@/src/utils/cn'

import { useLearningPaths } from '../queries/analyticsQueries'
import { relativeTime } from '../utils/formatters'
import { DeadEndDetector } from './DeadEndDetector'
import { PathComparison } from './PathComparison'
import { PathFlowDiagram } from './PathFlowDiagram'

type Tab = 'flow' | 'compare' | 'deadend'

const TABS: { id: Tab; label: string }[] = [
  { id: 'flow', label: 'Alur Belajar' },
  { id: 'compare', label: 'Perbandingan' },
  { id: 'deadend', label: 'Dead End' },
]

interface Props {
  courseId: string
}

export function PathAnalysisDashboard({ courseId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('flow')
  const [selectedHashes, setSelectedHashes] = useState<[string | null, string | null]>([null, null])

  const { data: paths = [], isLoading } = useLearningPaths(courseId)

  // ⚡ Perf: stabilize callback ref passed to PathFlowDiagram (renders list of paths with buttons)
  const handlePathSelect = useCallback((hash: string) => {
    setSelectedHashes((prev) => {
      if (prev[0] === hash) return [null, prev[1]]
      if (prev[1] === hash) return [prev[0], null]
      if (!prev[0]) return [hash, prev[1]]
      if (!prev[1]) return [prev[0], hash]
      return [hash, null]
    })
  }, [])

  const computedAt = paths[0]?.computed_at

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-violet-500" />
        <h2 className="text-base font-semibold text-slate-800 dark:text-white">
          Analisis Jalur Belajar
        </h2>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'flow' && (
        <PathFlowDiagram
          paths={paths}
          selectedHash={selectedHashes[0] ?? selectedHashes[1]}
          onSelect={handlePathSelect}
        />
      )}
      {activeTab === 'compare' && <PathComparison paths={paths} selectedHashes={selectedHashes} />}
      {activeTab === 'deadend' && <DeadEndDetector paths={paths} />}

      {/* Footer */}
      {computedAt && (
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          Dihitung: {relativeTime(computedAt)} · diperbarui setiap minggu
        </p>
      )}
    </div>
  )
}
