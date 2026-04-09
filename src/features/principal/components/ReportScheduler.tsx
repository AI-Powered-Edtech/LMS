// ==========================================================================
// ReportScheduler — Modal pengaturan laporan otomatis
//
// UI:
//   - Frekuensi: Bulanan / Mingguan / Triwulanan
//   - Email tujuan
//   - Toggle aktif/nonaktif
//   - Preview: "Laporan berikutnya dikirim pada X"
//   - Simpan ke principal_settings
// ==========================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useAuth } from '@/contexts/AuthContext'

import { updatePrincipalSettings } from '../api/executiveApi'
import { principalKeys, usePrincipalSettings } from '../hooks/useExecutiveData'
import type { ReportSchedulerState } from '../types'

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

/* ─── Helper: Next report date ─────────────────────────────── */

function getNextReportDate(frequency: ReportSchedulerState['frequency']): string {
  const now = new Date()

  if (frequency === 'monthly') {
    // First day of next month
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return `1 ${ID_MONTHS_FULL[next.getMonth()]} ${next.getFullYear()}`
  }

  if (frequency === 'weekly') {
    // Next Monday
    const next = new Date(now)
    const day = now.getDay()
    const daysUntilMonday = day === 0 ? 1 : 8 - day
    next.setDate(now.getDate() + daysUntilMonday)
    return next.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  if (frequency === 'quarterly') {
    // First day of next quarter
    const currentQuarter = Math.floor(now.getMonth() / 3)
    const nextQuarterMonth = (currentQuarter + 1) * 3
    const nextYear = nextQuarterMonth >= 12 ? now.getFullYear() + 1 : now.getFullYear()
    const nextMonth = nextQuarterMonth % 12
    return `1 ${ID_MONTHS_FULL[nextMonth]} ${nextYear}`
  }

  return '—'
}

/* ─── Props ────────────────────────────────────────────────── */

export interface ReportSchedulerProps {
  open: boolean
  onClose: () => void
}

/* ─── ReportScheduler Component ───────────────────────────── */

export function ReportScheduler({ open, onClose }: ReportSchedulerProps) {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()
  const { data: settings } = usePrincipalSettings()

  // Initialize from existing settings
  const [form, setForm] = useState<ReportSchedulerState>({
    frequency: 'monthly',
    email: '',
    enabled: false,
  })
  const [emailError, setEmailError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Sync from loaded settings
  useEffect(() => {
    if (settings) {
      setForm({
        frequency: (settings.report_schedule as ReportSchedulerState['frequency']) ?? 'monthly',
        email: settings.report_email ?? '',
        enabled: settings.report_auto_enabled ?? false,
      })
    }
  }, [settings])

  // Mutation to save settings
  const saveMutation = useMutation({
    mutationFn: async (data: ReportSchedulerState) => {
      if (!tenantId) throw new Error('Tenant tidak ditemukan')
      await updatePrincipalSettings(tenantId, {
        report_schedule: data.enabled ? data.frequency : null,
        report_email: data.email || null,
        report_auto_enabled: data.enabled,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: principalKeys.settings(tenantId ?? '') })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  function validateEmail(email: string): boolean {
    if (!email) return true // empty is ok if disabled
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  function handleSave() {
    // Validate email if enabled
    if (form.enabled && !validateEmail(form.email)) {
      setEmailError('Format email tidak valid')
      return
    }
    if (form.enabled && !form.email) {
      setEmailError('Email wajib diisi jika laporan otomatis diaktifkan')
      return
    }
    setEmailError(null)
    saveMutation.mutate(form)
  }

  const nextDate = getNextReportDate(form.frequency)

  return (
    <Modal open={open} onClose={onClose} size="md">
      <ModalHeader title="⏰ Laporan Otomatis" onClose={onClose} />
      <ModalBody>
        <div className="space-y-5">
          {/* ── Toggle aktif ── */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
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
              aria-checked={form.enabled}
              onClick={() => setForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                form.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  form.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* ── Frekuensi ── */}
          <Select
            label="Frekuensi"
            options={FREQUENCY_OPTIONS}
            value={form.frequency}
            disabled={!form.enabled}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                frequency: e.target.value as ReportSchedulerState['frequency'],
              }))
            }
          />

          {/* ── Email ── */}
          <Input
            label="Kirim ke email"
            type="email"
            placeholder="kepala@sekolah.sch.id"
            value={form.email}
            disabled={!form.enabled}
            error={emailError ?? undefined}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, email: e.target.value }))
              setEmailError(null)
            }}
          />

          {/* ── Preview next date ── */}
          {form.enabled && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                📅 Laporan berikutnya akan dikirim pada <strong>{nextDate}</strong>
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                Dikirim ke: {form.email || <span className="italic">belum diisi</span>}
              </p>
            </div>
          )}

          {/* ── Catatan jika nonaktif ── */}
          {!form.enabled && (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
              Aktifkan toggle di atas untuk mengatur jadwal laporan otomatis.
            </p>
          )}

          {/* ── Success ── */}
          {saved && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                ✓ Pengaturan berhasil disimpan
              </p>
            </div>
          )}

          {/* ── Error ── */}
          {saveMutation.isError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">
                {saveMutation.error instanceof Error
                  ? saveMutation.error.message
                  : 'Gagal menyimpan pengaturan. Silakan coba lagi.'}
              </p>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={saveMutation.isPending}>
          Tutup
        </Button>
        <Button variant="primary" onClick={handleSave} loading={saveMutation.isPending}>
          Simpan Pengaturan
        </Button>
      </ModalFooter>
    </Modal>
  )
}
