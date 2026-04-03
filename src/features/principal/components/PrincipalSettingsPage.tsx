// ==========================================================================
// PrincipalSettingsPage — Halaman pengaturan dashboard kepala sekolah
//
// Fitur:
//   - Toggle widget dashboard (adopsi, akademik, ROI, guru, survey)
//   - Tanggal baseline LMS (untuk kalkulasi sebelum/sesudah)
//   - Laporan otomatis (frekuensi, email, toggle aktif)
//   - Dirty state tracking & toast notifikasi
// ==========================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'

import { updatePrincipalSettings } from '../api/executiveApi'
import { principalKeys, usePrincipalSettings } from '../hooks/useExecutiveData'
import type { PrincipalSettings, ReportSchedulerState } from '../types'

/* ─── Constants ────────────────────────────────────────────── */

const ID_MONTHS_FULL = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Bulanan' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'quarterly', label: 'Triwulanan' },
]

interface WidgetOption {
  key: keyof Pick<
    PrincipalSettings,
    | 'widget_adoption'
    | 'widget_academic'
    | 'widget_roi'
    | 'widget_teacher_ranking'
    | 'widget_survey'
  >
  label: string
}

const WIDGET_OPTIONS: WidgetOption[] = [
  { key: 'widget_adoption', label: 'Adopsi Platform' },
  { key: 'widget_academic', label: 'Ringkasan Akademik' },
  { key: 'widget_roi', label: 'Kalkulator ROI' },
  { key: 'widget_teacher_ranking', label: 'Peringkat Guru' },
  { key: 'widget_survey', label: 'Survey Kepuasan' },
]

/* ─── Form State ───────────────────────────────────────────── */

interface SettingsFormState {
  widget_adoption: boolean
  widget_academic: boolean
  widget_roi: boolean
  widget_teacher_ranking: boolean
  widget_survey: boolean
  baseline_date: string
  report_frequency: ReportSchedulerState['frequency']
  report_email: string
  report_enabled: boolean
}

function getDefaultFormState(): SettingsFormState {
  return {
    widget_adoption: true,
    widget_academic: true,
    widget_roi: true,
    widget_teacher_ranking: true,
    widget_survey: false,
    baseline_date: '',
    report_frequency: 'monthly',
    report_email: '',
    report_enabled: false,
  }
}

function settingsToForm(settings: PrincipalSettings | null | undefined): SettingsFormState {
  if (!settings) return getDefaultFormState()
  return {
    widget_adoption: settings.widget_adoption ?? true,
    widget_academic: settings.widget_academic ?? true,
    widget_roi: settings.widget_roi ?? true,
    widget_teacher_ranking: settings.widget_teacher_ranking ?? true,
    widget_survey: settings.widget_survey ?? false,
    baseline_date: settings.baseline_date ?? '',
    report_frequency: (settings.report_schedule as ReportSchedulerState['frequency']) ?? 'monthly',
    report_email: settings.report_email ?? '',
    report_enabled: settings.report_auto_enabled ?? false,
  }
}

/* ─── Helper: Next report date ─────────────────────────────── */

function getNextReportDate(frequency: ReportSchedulerState['frequency']): string {
  const now = new Date()

  if (frequency === 'monthly') {
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return `1 ${ID_MONTHS_FULL[next.getMonth()]} ${next.getFullYear()}`
  }

  if (frequency === 'weekly') {
    const next = new Date(now)
    const day = now.getDay()
    const daysUntilMonday = day === 0 ? 1 : 8 - day
    next.setDate(now.getDate() + daysUntilMonday)
    return next.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  if (frequency === 'quarterly') {
    const currentQuarter = Math.floor(now.getMonth() / 3)
    const nextQuarterMonth = (currentQuarter + 1) * 3
    const nextYear = nextQuarterMonth >= 12 ? now.getFullYear() + 1 : now.getFullYear()
    const nextMonth = nextQuarterMonth % 12
    return `1 ${ID_MONTHS_FULL[nextMonth]} ${nextYear}`
  }

  return '—'
}

/* ─── Loading Skeleton ─────────────────────────────────────── */

function SettingsSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <Skeleton className="h-8 w-64" />

      {/* Widget section */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      </div>

      {/* Baseline section */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Report section */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 space-y-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Save button */}
      <Skeleton className="h-10 w-40" />
    </div>
  )
}

/* ─── Main Component ───────────────────────────────────────── */

export function PrincipalSettingsPage() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()
  const addToast = useToast((s) => s.addToast)
  const { data: settings, isLoading } = usePrincipalSettings()

  const [form, setForm] = useState<SettingsFormState>(getDefaultFormState)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Sync form from loaded settings
  useEffect(() => {
    if (settings !== undefined) {
      setForm(settingsToForm(settings))
      setInitialized(true)
    }
  }, [settings])

  // Dirty state: compare current form with loaded settings
  const isDirty = useMemo(() => {
    if (!initialized) return false
    const original = settingsToForm(settings)
    return JSON.stringify(form) !== JSON.stringify(original)
  }, [form, settings, initialized])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: SettingsFormState) => {
      if (!tenantId) throw new Error('Tenant tidak ditemukan')
      await updatePrincipalSettings(tenantId, {
        widget_adoption: data.widget_adoption,
        widget_academic: data.widget_academic,
        widget_roi: data.widget_roi,
        widget_teacher_ranking: data.widget_teacher_ranking,
        widget_survey: data.widget_survey,
        baseline_date: data.baseline_date || undefined,
        report_schedule: data.report_enabled ? data.report_frequency : null,
        report_email: data.report_email || null,
        report_auto_enabled: data.report_enabled,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: principalKeys.settings(tenantId ?? '') })
      addToast({ type: 'success', message: 'Pengaturan berhasil disimpan' })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Gagal menyimpan pengaturan',
      })
    },
  })

  // Validate & save
  const handleSave = useCallback(() => {
    if (form.report_enabled) {
      if (!form.report_email) {
        setEmailError('Email wajib diisi jika laporan otomatis diaktifkan')
        return
      }
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!re.test(form.report_email)) {
        setEmailError('Format email tidak valid')
        return
      }
    }
    setEmailError(null)
    saveMutation.mutate(form)
  }, [form, saveMutation])

  // Toggle individual widget
  const toggleWidget = useCallback((key: WidgetOption['key']) => {
    setForm((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const nextDate = getNextReportDate(form.report_frequency)

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <SettingsSkeleton />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ── Header ── */}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Pengaturan Dashboard
        </h1>

        {/* ── Widget Dashboard ── */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">📊</span>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Widget Dashboard
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Pilih widget yang ditampilkan di dashboard:
          </p>
          <div className="space-y-3">
            {WIDGET_OPTIONS.map((opt) => (
              <label key={opt.key} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form[opt.key]}
                  onChange={() => toggleWidget(opt.key)}
                  className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:checked:bg-blue-600 cursor-pointer"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* ── Tanggal Baseline LMS ── */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">📅</span>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Tanggal Baseline LMS
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Tanggal mulai menggunakan LMS. Digunakan untuk kalkulasi perbandingan sebelum/sesudah
            LMS.
          </p>
          <Input
            label="Mulai pakai LMS"
            type="date"
            value={form.baseline_date}
            onChange={(e) => setForm((prev) => ({ ...prev, baseline_date: e.target.value }))}
          />
        </section>

        {/* ── Laporan Otomatis ── */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">📧</span>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Laporan Otomatis
            </h2>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 mb-5">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Aktifkan Laporan Otomatis
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Laporan akan dikirim ke email secara otomatis
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.report_enabled}
              onClick={() => setForm((prev) => ({ ...prev, report_enabled: !prev.report_enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                form.report_enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  form.report_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="space-y-4">
            {/* Frekuensi */}
            <Select
              label="Frekuensi"
              options={FREQUENCY_OPTIONS}
              value={form.report_frequency}
              disabled={!form.report_enabled}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  report_frequency: e.target.value as ReportSchedulerState['frequency'],
                }))
              }
            />

            {/* Email */}
            <Input
              label="Email tujuan"
              type="email"
              placeholder="kepala@sekolah.sch.id"
              value={form.report_email}
              disabled={!form.report_enabled}
              error={emailError ?? undefined}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, report_email: e.target.value }))
                setEmailError(null)
              }}
            />

            {/* Preview next date */}
            {form.report_enabled && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  📅 Laporan berikutnya akan dikirim pada <strong>{nextDate}</strong>
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                  Dikirim ke: {form.report_email || <span className="italic">belum diisi</span>}
                </p>
              </div>
            )}

            {/* Note if disabled */}
            {!form.report_enabled && (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                Aktifkan toggle di atas untuk mengatur jadwal laporan otomatis.
              </p>
            )}
          </div>
        </section>

        {/* ── Save Button ── */}
        <div className="pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSave}
            loading={saveMutation.isPending}
            disabled={!isDirty}
          >
            Simpan Perubahan
          </Button>
        </div>
      </div>
    </div>
  )
}
