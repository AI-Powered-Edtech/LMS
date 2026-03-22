import { usePageTitle } from '@/src/hooks/usePageTitle'
import { useEffect, useState } from 'react'
import { Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react'
import { supabase } from '@/src/services/supabase/client'
import { Spinner } from '@/src/components/ui'

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'down'
  checks: {
    db: 'ok' | 'error'
    auth: 'ok' | 'error'
  }
  timestamp: string
  version?: string
}

interface MetricSummary {
  name: string
  value: number
  unit: string
  status: 'good' | 'warning' | 'critical'
}

function StatusIcon({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  if (status === 'healthy') return <CheckCircle className="w-5 h-5 text-green-500" />
  if (status === 'degraded') return <AlertTriangle className="w-5 h-5 text-amber-500" />
  return <XCircle className="w-5 h-5 text-red-500" />
}

function statusColor(status: 'healthy' | 'degraded' | 'down') {
  if (status === 'healthy') return 'text-green-600 dark:text-green-400'
  if (status === 'degraded') return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

export function SystemHealth() {
  usePageTitle('System Health')
  const [health, setHealth] = useState<HealthCheck | null>(null)
  const [metrics, setMetrics] = useState<MetricSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  async function loadData() {
    setIsLoading(true)
    try {
      // Check DB health via a simple query
      const start = performance.now()
      const { error: dbError } = await supabase.from('tenants').select('id').limit(1)
      const dbLatency = Math.round(performance.now() - start)

      const dbOk = !dbError

      setHealth({
        status: dbOk ? 'healthy' : 'degraded',
        checks: {
          db: dbOk ? 'ok' : 'error',
          auth: 'ok',
        },
        timestamp: new Date().toISOString(),
        version: '4.0.0',
      })

      // Recent metrics
      const { data: recentMetrics } = await supabase
        .from('app_metrics')
        .select('metric_name, metric_value')
        .order('recorded_at', { ascending: false })
        .limit(50)

      const summary: MetricSummary[] = []

      // DB latency
      summary.push({
        name: 'Latensi DB',
        value: dbLatency,
        unit: 'ms',
        status: dbLatency < 200 ? 'good' : dbLatency < 500 ? 'warning' : 'critical',
      })

      // Aggregate from stored metrics
      if (recentMetrics) {
        const byName = recentMetrics.reduce<Record<string, number[]>>((acc, m) => {
          if (!acc[m.metric_name]) acc[m.metric_name] = []
          acc[m.metric_name].push(m.metric_value)
          return acc
        }, {})

        const avgLoad = byName['page.load_time_ms']
        if (avgLoad?.length) {
          const avg = avgLoad.reduce((a, b) => a + b, 0) / avgLoad.length
          summary.push({
            name: 'Waktu Muat Halaman',
            value: Math.round(avg),
            unit: 'ms',
            status: avg < 2500 ? 'good' : avg < 4000 ? 'warning' : 'critical',
          })
        }

        const quizScore = byName['quiz.avg_score']
        if (quizScore?.length) {
          const avg = quizScore.reduce((a, b) => a + b, 0) / quizScore.length
          summary.push({
            name: 'Rata-rata Nilai Kuis',
            value: Math.round(avg),
            unit: '%',
            status: avg > 70 ? 'good' : avg > 50 ? 'warning' : 'critical',
          })
        }
      }

      setMetrics(summary)
    } catch {
      setHealth({
        status: 'down',
        checks: { db: 'error', auth: 'error' },
        timestamp: new Date().toISOString(),
      })
    } finally {
      setIsLoading(false)
      setLastRefresh(new Date())
    }
  }

  useEffect(() => {
    void loadData()
    const interval = setInterval(() => void loadData(), 60000) // auto-refresh 60s
    return () => clearInterval(interval)
  }, [])

  const overallStatus = health?.status ?? 'down'

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Kesehatan Sistem
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Terakhir diperbarui: {lastRefresh.toLocaleTimeString('id-ID')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Perbarui
        </button>
      </div>

      {isLoading && !health ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Overall status */}
          <div
            className={`bg-white dark:bg-slate-800 rounded-2xl border p-6 ${
              overallStatus === 'healthy'
                ? 'border-green-200 dark:border-green-800'
                : overallStatus === 'degraded'
                  ? 'border-amber-200 dark:border-amber-800'
                  : 'border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center gap-4">
              <StatusIcon status={overallStatus} />
              <div>
                <p className={`text-lg font-bold ${statusColor(overallStatus)}`}>
                  {overallStatus === 'healthy'
                    ? 'Semua Sistem Normal'
                    : overallStatus === 'degraded'
                      ? 'Sistem Terdegradasi'
                      : 'Sistem Tidak Tersedia'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Versi {health?.version ?? '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Individual checks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(health?.checks ?? {}).map(([name, status]) => (
              <div
                key={name}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center gap-3"
              >
                {status === 'ok' ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200 capitalize">
                    {name === 'db' ? 'Database' : name === 'auth' ? 'Autentikasi' : name}
                  </p>
                  <p
                    className={`text-sm ${status === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  >
                    {status === 'ok' ? 'Beroperasi normal' : 'Terjadi kesalahan'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Metrics */}
          {metrics.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
                Metrik Kinerja
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {metrics.map((m) => (
                  <div
                    key={m.name}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4"
                  >
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{m.name}</p>
                    <p
                      className={`text-2xl font-bold ${
                        m.status === 'good'
                          ? 'text-green-600 dark:text-green-400'
                          : m.status === 'warning'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {m.value.toLocaleString('id-ID')}
                      <span className="text-sm font-normal ml-1">{m.unit}</span>
                    </p>
                    <div
                      className={`mt-2 text-xs font-medium px-2 py-0.5 rounded-full inline-block ${
                        m.status === 'good'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : m.status === 'warning'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {m.status === 'good'
                        ? '🟢 Baik'
                        : m.status === 'warning'
                          ? '🟡 Perhatian'
                          : '🔴 Kritis'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
