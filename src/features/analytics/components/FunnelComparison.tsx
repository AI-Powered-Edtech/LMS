// SYNC-HINT: {{ = {{ and }} = }}. Sync tool converts automatically.
import { ChevronRight, Plus, Trash2, TrendingDown } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { Skeleton } from '@/src/components/ui'

import { useDeleteFunnel, useFunnelList, useFunnelResults } from '../queries/analyticsQueries'
import { FunnelBuilder } from './FunnelBuilder'
import { FunnelChart } from './FunnelChart'

interface FunnelComparisonProps {
  courseId: string
}

export function FunnelComparison({ courseId }: FunnelComparisonProps) {
  const [showBuilder, setShowBuilder] = useState(false)
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null)

  const { data: funnels, isLoading } = useFunnelList(courseId)
  const { data: results, isLoading: resultsLoading } = useFunnelResults(
    selectedFunnelId ?? undefined
  )
  const deleteFunnel = useDeleteFunnel()

  const handleSaved = (id: string) => {
    setShowBuilder(false)
    setSelectedFunnelId(id)
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Analisis Corong</h3>
        </div>
        {!showBuilder && (
          <button
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300"
          >
            <Plus className="h-3.5 w-3.5" />
            Buat Corong
          </button>
        )}
      </div>

      <AnimatePresence>
        {showBuilder && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <FunnelBuilder
              courseId={courseId}
              onSaved={handleSaved}
              onCancel={() => setShowBuilder(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : funnels && funnels.length > 0 ? (
        <div className="space-y-1">
          {funnels.map((f) => (
            <div
              key={f.funnel_id}
              className={`group flex cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 transition-colors ${
                selectedFunnelId === f.funnel_id
                  ? 'bg-indigo-50 dark:bg-indigo-900/20'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              onClick={() =>
                setSelectedFunnelId((prev) => (prev === f.funnel_id ? null : f.funnel_id))
              }
            >
              <div className="flex items-center gap-2">
                <ChevronRight
                  className={`h-4 w-4 text-slate-400 transition-transform ${selectedFunnelId === f.funnel_id ? 'rotate-90' : ''}`}
                />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{f.name}</p>
                  <p className="text-xs text-slate-500">{f.step_count} langkah</p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (!confirm('Hapus corong ini? Aksi ini tidak bisa dibatalkan.')) return
                  deleteFunnel.mutate(f.funnel_id)
                }}
                aria-label="Hapus corong"
                className="hidden rounded p-1 text-slate-400 hover:text-red-500 group-hover:flex"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : !showBuilder ? (
        <p className="py-6 text-center text-sm text-slate-400">
          Belum ada corong. Buat yang pertama!
        </p>
      ) : null}

      <AnimatePresence>
        {selectedFunnelId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {resultsLoading ? (
              <Skeleton className="h-64 w-full rounded-xl" />
            ) : results && results.length > 0 ? (
              <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                <FunnelChart data={results} />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {results.map((step, i) => (
                    <div key={i} className="rounded-lg bg-white p-2 text-center dark:bg-slate-900">
                      <p className="text-xs text-slate-500">Langkah {i + 1}</p>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {step.user_count}
                      </p>
                      <p className="text-xs font-medium text-indigo-600">{step.conversion_rate}%</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-slate-400">
                Belum ada data untuk corong ini.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
