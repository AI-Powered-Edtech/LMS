// ==========================================================================
// SurveyResults — Dashboard hasil survey kepuasan
// Task 30.5
// ==========================================================================

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useTheme } from '@/contexts/ThemeContext'

import { useSurveyResults } from '../hooks/useExecutiveData'
import type { QuestionResult, SatisfactionSurvey } from '../types'

// ── Formatters ─────────────────────────────────────────────────

const AUDIENCE_LABELS: Record<string, string> = {
  teachers: 'Guru',
  students: 'Siswa',
  parents: 'Orang Tua',
  all: 'Semua',
}

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  draft: 'warning',
  closed: 'neutral',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  draft: 'Draft',
  closed: 'Ditutup',
}

// ── Rating Stars ───────────────────────────────────────────────

function RatingStars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`text-lg ${i < Math.round(value) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`}
        >
          ★
        </span>
      ))}
      <span className="ml-1 text-sm font-bold text-slate-700 dark:text-slate-300">
        {value.toFixed(1)}
      </span>
    </div>
  )
}

// ── Rating Distribution Bar ────────────────────────────────────

function RatingDistributionBar({
  distribution,
  total,
}: {
  distribution: Record<number, number>
  total: number
}) {
  const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']

  return (
    <div className="space-y-1 mt-2">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star] ?? 0
        const pct = total > 0 ? (count / total) * 100 : 0
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-slate-500 dark:text-slate-400">{star}</span>
            <span className="text-amber-400">★</span>
            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: COLORS[star - 1] }}
              />
            </div>
            <span className="w-8 text-right text-slate-500 dark:text-slate-400">{count}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Yes/No Pie Chart ───────────────────────────────────────────

function YesNoPieChart({
  yesCount,
  noCount,
  isDark,
}: {
  yesCount: number
  noCount: number
  isDark: boolean
}) {
  const total = yesCount + noCount
  const data = [
    { name: 'Ya', value: yesCount },
    { name: 'Tidak', value: noCount },
  ]
  const COLORS = ['#22c55e', '#ef4444']
  const tooltipBg = isDark ? '#1e293b' : '#ffffff'
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0'

  if (total === 0) {
    return <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Belum ada jawaban.</p>
  }

  return (
    <div className="flex items-center gap-4 mt-2">
      <ResponsiveContainer width={100} height={100}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={28} outerRadius={45} dataKey="value">
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: '0.5rem',
              fontSize: 11,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
          <span className="text-slate-700 dark:text-slate-300">Ya: {yesCount}</span>
          <span className="text-slate-400 text-xs">
            ({total > 0 ? ((yesCount / total) * 100).toFixed(0) : 0}%)
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          <span className="text-slate-700 dark:text-slate-300">Tidak: {noCount}</span>
          <span className="text-slate-400 text-xs">
            ({total > 0 ? ((noCount / total) * 100).toFixed(0) : 0}%)
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Word Cloud (simple) ────────────────────────────────────────

function SimpleWordCloud({ texts }: { texts: string[] }) {
  if (texts.length === 0) {
    return <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Belum ada jawaban.</p>
  }

  // Count word frequency
  const wordCount: Record<string, number> = {}
  texts.forEach((text) => {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)
    words.forEach((w) => {
      wordCount[w] = (wordCount[w] ?? 0) + 1
    })
  })

  const sorted = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  const maxCount = sorted[0]?.[1] ?? 1

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-2">
        {sorted.map(([word, count]) => {
          const size = Math.round(10 + (count / maxCount) * 6)
          const opacity = 0.5 + (count / maxCount) * 0.5
          return (
            <span
              key={word}
              className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
              style={{ fontSize: `${size}px`, opacity }}
              title={`Muncul ${count}x`}
            >
              {word}
            </span>
          )
        })}
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
        {texts.length} jawaban · {sorted.length} kata unik ditampilkan
      </p>
    </div>
  )
}

// ── Single Question Result ─────────────────────────────────────

interface QuestionResultCardProps {
  result: QuestionResult
  index: number
  isDark: boolean
}

function QuestionResultCard({ result, index, isDark }: QuestionResultCardProps) {
  const { question } = result
  const totalAnswers =
    question.type === 'rating'
      ? Object.values(result.ratingDistribution ?? {}).reduce((a, b) => a + b, 0)
      : question.type === 'yesno'
        ? (result.yesCount ?? 0) + (result.noCount ?? 0)
        : (result.textAnswers?.length ?? 0)

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-5 text-center">
            {index + 1}
          </span>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{question.text}</p>
        </div>
        <Badge variant="neutral" size="sm">
          {totalAnswers} jawaban
        </Badge>
      </div>

      {question.type === 'rating' && (
        <div className="ml-7">
          <RatingStars value={result.ratingAvg ?? 0} />
          {result.ratingDistribution && (
            <RatingDistributionBar distribution={result.ratingDistribution} total={totalAnswers} />
          )}
        </div>
      )}

      {question.type === 'yesno' && (
        <div className="ml-7">
          <YesNoPieChart
            yesCount={result.yesCount ?? 0}
            noCount={result.noCount ?? 0}
            isDark={isDark}
          />
        </div>
      )}

      {question.type === 'text' && (
        <div className="ml-7">
          <SimpleWordCloud texts={result.textAnswers ?? []} />
        </div>
      )}
    </div>
  )
}

// ── Export to CSV ──────────────────────────────────────────────

function exportResultsCSV(
  survey: SatisfactionSurvey,
  totalResponses: number,
  questionResults: QuestionResult[]
) {
  const rows: string[][] = [
    ['Survey', survey.title],
    ['Status', STATUS_LABELS[survey.status]],
    ['Target', AUDIENCE_LABELS[survey.target_audience]],
    ['Total Responden', String(totalResponses)],
    ['Diekspor', new Date().toLocaleDateString('id-ID')],
    [],
    ['No', 'Pertanyaan', 'Tipe', 'Hasil'],
  ]

  questionResults.forEach((r, i) => {
    let hasil = ''
    if (r.question.type === 'rating') {
      hasil = `Rata-rata: ${(r.ratingAvg ?? 0).toFixed(2)}/5`
    } else if (r.question.type === 'yesno') {
      const total = (r.yesCount ?? 0) + (r.noCount ?? 0)
      hasil = `Ya: ${r.yesCount ?? 0} (${total > 0 ? (((r.yesCount ?? 0) / total) * 100).toFixed(0) : 0}%), Tidak: ${r.noCount ?? 0}`
    } else {
      hasil = (r.textAnswers ?? []).join(' | ')
    }
    rows.push([String(i + 1), r.question.text, r.question.type, hasil])
  })

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `survey_${survey.id.slice(0, 8)}_hasil.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Props ──────────────────────────────────────────────────────

interface SurveyResultsProps {
  survey: SatisfactionSurvey
  onClose: () => void
}

// ── Main Component ─────────────────────────────────────────────

export function SurveyResults({ survey, onClose }: SurveyResultsProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const { data, isLoading, error } = useSurveyResults(survey.id)

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm transition-colors"
            >
              ← Kembali ke Daftar Survey
            </button>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{survey.title}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={STATUS_VARIANTS[survey.status]} size="sm">
              {STATUS_LABELS[survey.status]}
            </Badge>
            <Badge variant="info" size="sm">
              {AUDIENCE_LABELS[survey.target_audience]}
            </Badge>
            {survey.start_date && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(survey.start_date).toLocaleDateString('id-ID')}
                {survey.end_date
                  ? ` – ${new Date(survey.end_date).toLocaleDateString('id-ID')}`
                  : ''}
              </span>
            )}
          </div>
        </div>
        {data && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportResultsCSV(survey, data.totalResponses, data.questionResults)}
          >
            📥 Export CSV
          </Button>
        )}
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <Card>
          <p className="text-sm text-red-600 dark:text-red-400 text-center py-4">
            Gagal memuat hasil survey. Silakan coba lagi.
          </p>
        </Card>
      )}

      {/* ── Stats Summary ── */}
      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="text-center">
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {data.totalResponses}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total Responden</p>
            </Card>
            <Card className="text-center">
              <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                {survey.questions.length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pertanyaan</p>
            </Card>
            <Card className="text-center col-span-2 sm:col-span-1">
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {survey.questions.filter((q) => q.type === 'rating').length > 0
                  ? (() => {
                      const ratingResults = data.questionResults.filter(
                        (r) => r.question.type === 'rating' && r.ratingAvg !== undefined
                      )
                      if (ratingResults.length === 0) return '–'
                      const avgAll =
                        ratingResults.reduce((sum, r) => sum + (r.ratingAvg ?? 0), 0) /
                        ratingResults.length
                      return `${avgAll.toFixed(1)}/5`
                    })()
                  : '–'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Rata-rata Rating</p>
            </Card>
          </div>

          {/* ── Empty Responses ── */}
          {data.totalResponses === 0 && (
            <Card>
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="text-4xl">📭</span>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Belum Ada Respons
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Survey{' '}
                    {survey.status === 'active'
                      ? 'sudah dipublikasikan dan menunggu respons.'
                      : 'belum dipublikasikan.'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* ── Per Question Results ── */}
          {data.totalResponses > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Hasil per Pertanyaan
              </h3>
              {data.questionResults.map((result, i) => (
                <QuestionResultCard
                  key={result.question.id}
                  result={result}
                  index={i}
                  isDark={isDark}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
