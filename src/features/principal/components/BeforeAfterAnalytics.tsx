// ==========================================================================
// BeforeAfterAnalytics — Halaman Analitik Sebelum & Sesudah LMS
// Task 30.4
// ==========================================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useTheme } from '@/contexts/ThemeContext'

import { useBaselineMetrics, useExecutiveData } from '../hooks/useExecutiveData'
import type { SchoolBaselineMetrics } from '../types'

// ── Formatters ─────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)

const fmtPercent = (n: number) => `${n.toFixed(1)}%`

// ── Edit Baseline Modal ────────────────────────────────────────

interface EditBaselineModalProps {
  open: boolean
  onClose: () => void
  current: SchoolBaselineMetrics | null
  onSave: (
    data: Omit<SchoolBaselineMetrics, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
  ) => Promise<void>
  isSaving: boolean
}

function EditBaselineModal({ open, onClose, current, onSave, isSaving }: EditBaselineModalProps) {
  const [form, setForm] = useState<{
    baseline_date: string
    avg_grade_before: string
    attendance_rate_before: string
    paper_cost_monthly_rp: string
    teacher_grading_hours_weekly: string
    notes: string
  }>({
    baseline_date: current?.baseline_date ?? '',
    avg_grade_before: current?.avg_grade_before?.toString() ?? '',
    attendance_rate_before: current?.attendance_rate_before?.toString() ?? '',
    paper_cost_monthly_rp: current?.paper_cost_monthly_rp?.toString() ?? '',
    teacher_grading_hours_weekly: current?.teacher_grading_hours_weekly?.toString() ?? '',
    notes: current?.notes ?? '',
  })
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!form.baseline_date) {
      setError('Tanggal baseline wajib diisi.')
      return
    }
    setError(null)
    await onSave({
      baseline_date: form.baseline_date,
      avg_grade_before: form.avg_grade_before ? Number(form.avg_grade_before) : null,
      attendance_rate_before: form.attendance_rate_before
        ? Number(form.attendance_rate_before)
        : null,
      paper_cost_monthly_rp: form.paper_cost_monthly_rp ? Number(form.paper_cost_monthly_rp) : null,
      teacher_grading_hours_weekly: form.teacher_grading_hours_weekly
        ? Number(form.teacher_grading_hours_weekly)
        : null,
      notes: form.notes || null,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>Edit Data Baseline (Sebelum LMS)</ModalHeader>
      <ModalBody>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Masukkan data rata-rata sekolah <strong>sebelum</strong> menggunakan EduSync LMS. Data ini
          akan dibandingkan dengan kondisi saat ini.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Tanggal Baseline <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={form.baseline_date}
              onChange={(e) => setForm((f) => ({ ...f, baseline_date: e.target.value }))}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tanggal mulai penggunaan LMS (sebagai titik pembanding)
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Rata-rata Nilai Sebelum LMS
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                placeholder="Contoh: 72"
                value={form.avg_grade_before}
                onChange={(e) => setForm((f) => ({ ...f, avg_grade_before: e.target.value }))}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Skala 0–100</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tingkat Kehadiran Sebelum LMS (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                placeholder="Contoh: 78"
                value={form.attendance_rate_before}
                onChange={(e) => setForm((f) => ({ ...f, attendance_rate_before: e.target.value }))}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Persentase 0–100</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Biaya Kertas per Bulan (Rp)
              </label>
              <Input
                type="number"
                min={0}
                placeholder="Contoh: 2000000"
                value={form.paper_cost_monthly_rp}
                onChange={(e) => setForm((f) => ({ ...f, paper_cost_monthly_rp: e.target.value }))}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Estimasi pengeluaran kertas/bulan
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Jam Koreksi Guru per Minggu
              </label>
              <Input
                type="number"
                min={0}
                step={0.5}
                placeholder="Contoh: 20"
                value={form.teacher_grading_hours_weekly}
                onChange={(e) =>
                  setForm((f) => ({ ...f, teacher_grading_hours_weekly: e.target.value }))
                }
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Rata-rata jam/minggu per guru
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Catatan (Opsional)
            </label>
            <textarea
              rows={3}
              placeholder="Catatan tambahan tentang kondisi sebelum LMS..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={isSaving}>
          Batal
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Spinner size="sm" /> : null}
          Simpan Data Baseline
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ── Comparison Card ────────────────────────────────────────────

interface ComparisonCardProps {
  icon: string
  label: string
  before: string | null
  after: string | null
  delta: string | null
  isPositive: boolean // apakah perubahan ini positif?
  color: string
}

function ComparisonCard({
  icon,
  label,
  before,
  after,
  delta,
  isPositive,
  color,
}: ComparisonCardProps) {
  const trendIcon = delta ? (isPositive ? '↑' : '↓') : null
  const trendColor = delta
    ? isPositive
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400'
    : ''

  return (
    <Card className="flex flex-col gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${color}`}>
        {icon}
      </div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
        {label}
      </p>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Sebelum LMS</p>
          <p className="text-lg font-bold text-slate-600 dark:text-slate-400">
            {before ?? <span className="text-slate-400 text-sm">Belum diisi</span>}
          </p>
        </div>
        <span className="text-slate-300 dark:text-slate-600 text-xl mb-1">→</span>
        <div className="flex-1">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">Sekarang</p>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {after ?? <span className="text-slate-400 text-sm">Tidak ada data</span>}
          </p>
        </div>
      </div>
      {delta && (
        <div className={`text-sm font-semibold ${trendColor}`}>
          {trendIcon} {delta}
        </div>
      )}
    </Card>
  )
}

// ── ROI Summary ────────────────────────────────────────────────

interface ROISummaryProps {
  baseline: SchoolBaselineMetrics | null
  currentPaperCostSaved: number
  currentTeacherHoursSaved: number
}

function ROISummary({
  baseline,
  currentPaperCostSaved,
  currentTeacherHoursSaved,
}: ROISummaryProps) {
  const paperBefore = baseline?.paper_cost_monthly_rp ?? 0
  const paperNow = Math.max(0, paperBefore - currentPaperCostSaved)
  const paperSaving = paperBefore - paperNow

  const hoursBefore = baseline?.teacher_grading_hours_weekly ?? 0
  const hoursNow = Math.max(0, hoursBefore - currentTeacherHoursSaved)
  const hoursSaving = hoursBefore - hoursNow

  if (!baseline) return null

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">💰</span>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Ringkasan Penghematan (ROI)
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
            Penghematan Kertas/Bulan
          </p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            {fmtCurrency(paperSaving)}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            Dari {fmtCurrency(paperBefore)} → {fmtCurrency(paperNow)}/bulan
          </p>
        </div>
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            Efisiensi Waktu Guru/Minggu
          </p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
            {hoursSaving.toFixed(1)} jam
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Dari {hoursBefore.toFixed(1)} jam → {hoursNow.toFixed(1)} jam/minggu
          </p>
        </div>
      </div>
    </Card>
  )
}

// ── Bar Chart ──────────────────────────────────────────────────

interface ComparisonChartProps {
  data: Array<{ metric: string; sebelum: number; sesudah: number }>
  isDark: boolean
}

function ComparisonChart({ data, isDark }: ComparisonChartProps) {
  const gridColor = isDark ? '#334155' : '#e2e8f0'
  const tickColor = isDark ? '#94a3b8' : '#64748b'
  const tooltipBg = isDark ? '#1e293b' : '#ffffff'
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0'
  const tooltipText = isDark ? '#f1f5f9' : '#0f172a'

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 dark:text-slate-500">
        <p className="text-sm">Isi data baseline untuk melihat perbandingan.</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="metric" tick={{ fontSize: 11, fill: tickColor }} />
        <YAxis tick={{ fontSize: 11, fill: tickColor }} />
        <Tooltip
          contentStyle={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: '0.5rem',
            color: tooltipText,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: tickColor, paddingTop: 8 }} />
        <Bar dataKey="sebelum" name="Sebelum LMS" fill="#94a3b8" radius={[4, 4, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={isDark ? '#475569' : '#94a3b8'} />
          ))}
        </Bar>
        <Bar dataKey="sesudah" name="Sesudah LMS" fill="#3b82f6" radius={[4, 4, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill="#3b82f6" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Main Component ─────────────────────────────────────────────

export function BeforeAfterAnalytics() {
  const navigate = useNavigate()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const {
    data: baseline,
    isLoading: isBaselineLoading,
    saveBaseline,
    isSaving,
  } = useBaselineMetrics()
  const { overview, roiMetrics, isLoading: isOverviewLoading } = useExecutiveData()

  const [showEditModal, setShowEditModal] = useState(false)

  const isLoading = isBaselineLoading || isOverviewLoading

  // Current "after" values from real data
  const currentAvgGrade = overview?.avg_quiz_score ?? null
  const currentAttendance = overview
    ? overview.total_students > 0
      ? (overview.active_students / overview.total_students) * 100
      : null
    : null
  const currentPaperCostSaved = roiMetrics?.paper_saved_cost ?? 0
  const currentTeacherHoursSaved = roiMetrics?.teacher_time_saved_hours ?? 0

  // Compute paper cost "now" = baseline - saved
  const paperCostNow = baseline?.paper_cost_monthly_rp
    ? Math.max(0, baseline.paper_cost_monthly_rp - currentPaperCostSaved)
    : null
  const teacherHoursNow = baseline?.teacher_grading_hours_weekly
    ? Math.max(0, baseline.teacher_grading_hours_weekly - currentTeacherHoursSaved)
    : null

  // Delta helpers
  const gradeDelta =
    baseline?.avg_grade_before != null && currentAvgGrade != null
      ? currentAvgGrade - baseline.avg_grade_before
      : null

  const attendanceDelta =
    baseline?.attendance_rate_before != null && currentAttendance != null
      ? currentAttendance - baseline.attendance_rate_before
      : null

  const paperDelta =
    baseline?.paper_cost_monthly_rp != null && paperCostNow != null
      ? baseline.paper_cost_monthly_rp - paperCostNow
      : null

  const hoursDelta =
    baseline?.teacher_grading_hours_weekly != null && teacherHoursNow != null
      ? baseline.teacher_grading_hours_weekly - teacherHoursNow
      : null

  // Chart data (only normalized percentage-like values for fair comparison)
  const chartData = baseline
    ? [
        ...(baseline.avg_grade_before != null && currentAvgGrade != null
          ? [
              {
                metric: 'Nilai (/100)',
                sebelum: baseline.avg_grade_before,
                sesudah: currentAvgGrade,
              },
            ]
          : []),
        ...(baseline.attendance_rate_before != null && currentAttendance != null
          ? [
              {
                metric: 'Kehadiran (%)',
                sebelum: baseline.attendance_rate_before,
                sesudah: Number(currentAttendance.toFixed(1)),
              },
            ]
          : []),
      ]
    : []

  return (
    <div className="min-h-full space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/app/principal')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-sm"
            >
              ← Kembali
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-1">
            <span>📊</span>
            <span>Analitik Sebelum &amp; Sesudah LMS</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Perbandingan kondisi sekolah sebelum dan sesudah implementasi EduSync
          </p>
        </div>
        <div className="flex items-center gap-2">
          {baseline && (
            <Badge variant="info" size="sm">
              Baseline:{' '}
              {new Date(baseline.baseline_date).toLocaleDateString('id-ID', {
                month: 'long',
                year: 'numeric',
              })}
            </Badge>
          )}
          <Button variant="primary" size="sm" onClick={() => setShowEditModal(true)}>
            ✏️ Edit Data Baseline
          </Button>
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {/* ── No baseline notice ── */}
      {!isLoading && !baseline && (
        <Card>
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="text-5xl">📋</span>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Belum Ada Data Baseline
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Tambahkan data kondisi sekolah sebelum menggunakan EduSync untuk melihat
                perbandingan dampak nyata LMS.
              </p>
            </div>
            <Button variant="primary" onClick={() => setShowEditModal(true)}>
              Tambah Data Baseline
            </Button>
          </div>
        </Card>
      )}

      {/* ── Comparison Cards ── */}
      {!isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ComparisonCard
            icon="⭐"
            label="Rata-rata Nilai"
            before={baseline?.avg_grade_before != null ? `${baseline.avg_grade_before}/100` : null}
            after={currentAvgGrade != null ? `${currentAvgGrade.toFixed(1)}/100` : null}
            delta={
              gradeDelta != null
                ? `${gradeDelta > 0 ? '+' : ''}${gradeDelta.toFixed(1)} poin`
                : null
            }
            isPositive={gradeDelta != null && gradeDelta > 0}
            color="bg-amber-50 dark:bg-amber-900/30"
          />
          <ComparisonCard
            icon="🎓"
            label="Tingkat Kehadiran"
            before={
              baseline?.attendance_rate_before != null
                ? fmtPercent(baseline.attendance_rate_before)
                : null
            }
            after={currentAttendance != null ? fmtPercent(currentAttendance) : null}
            delta={
              attendanceDelta != null
                ? `${attendanceDelta > 0 ? '+' : ''}${attendanceDelta.toFixed(1)}%`
                : null
            }
            isPositive={attendanceDelta != null && attendanceDelta > 0}
            color="bg-blue-50 dark:bg-blue-900/30"
          />
          <ComparisonCard
            icon="📄"
            label="Biaya Kertas/Bulan"
            before={
              baseline?.paper_cost_monthly_rp != null
                ? fmtCurrency(baseline.paper_cost_monthly_rp)
                : null
            }
            after={paperCostNow != null ? fmtCurrency(paperCostNow) : null}
            delta={paperDelta != null ? `Hemat ${fmtCurrency(paperDelta)}` : null}
            isPositive={paperDelta != null && paperDelta > 0}
            color="bg-emerald-50 dark:bg-emerald-900/30"
          />
          <ComparisonCard
            icon="⏱️"
            label="Jam Koreksi/Minggu"
            before={
              baseline?.teacher_grading_hours_weekly != null
                ? `${baseline.teacher_grading_hours_weekly} jam`
                : null
            }
            after={teacherHoursNow != null ? `${teacherHoursNow.toFixed(1)} jam` : null}
            delta={hoursDelta != null ? `Hemat ${hoursDelta.toFixed(1)} jam` : null}
            isPositive={hoursDelta != null && hoursDelta > 0}
            color="bg-violet-50 dark:bg-violet-900/30"
          />
        </div>
      )}

      {/* ── Bar Chart ── */}
      {!isLoading && (
        <Card>
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Perbandingan Visual
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Perbandingan metrik utama sebelum dan sesudah implementasi LMS
            </p>
          </div>
          <ComparisonChart data={chartData} isDark={isDark} />
        </Card>
      )}

      {/* ── ROI Summary ── */}
      {!isLoading && baseline && (
        <ROISummary
          baseline={baseline}
          currentPaperCostSaved={currentPaperCostSaved}
          currentTeacherHoursSaved={currentTeacherHoursSaved}
        />
      )}

      {/* ── Notes ── */}
      {!isLoading && baseline?.notes && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Catatan Baseline
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{baseline.notes}</p>
        </Card>
      )}

      {/* ── Edit Modal ── */}
      <EditBaselineModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        current={baseline ?? null}
        onSave={saveBaseline}
        isSaving={isSaving}
      />
    </div>
  )
}
