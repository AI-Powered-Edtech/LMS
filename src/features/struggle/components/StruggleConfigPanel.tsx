import { useState, useEffect } from 'react';
import { Save, CheckCircle } from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { Card, Skeleton } from '@/src/components/ui';
import { useStruggleConfig, useUpdateStruggleConfig } from '../queries/useStruggleQueries';
import type { StruggleConfig } from '../types';

interface Props {
  className?: string;
}

export function StruggleConfigPanel({ className }: Props) {
  const { data: config, isLoading } = useStruggleConfig();
  const updateMutation = useUpdateStruggleConfig();
  const [saved, setSaved] = useState(false);

  // Local form state
  const [form, setForm] = useState<StruggleConfig>({
    threshold_medium: 3,
    threshold_high: 5,
    notification_enabled: true,
    student_prompt_enabled: true,
    cooldown_hours: 24,
  });

  // Sync from server
  useEffect(() => {
    if (config) {
      setForm({
        threshold_medium: config.threshold_medium,
        threshold_high: config.threshold_high,
        notification_enabled: config.notification_enabled,
        student_prompt_enabled: config.student_prompt_enabled,
        cooldown_hours: config.cooldown_hours,
      });
    }
  }, [config]);

  async function handleSave() {
    await updateMutation.mutateAsync(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (isLoading) {
    return (
      <Card className={cn('space-y-4', className)}>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </Card>
    );
  }

  return (
    <Card className={cn('space-y-6', className)}>
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Pengaturan Deteksi Kesulitan
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Konfigurasi ambang batas dan notifikasi sistem deteksi kesulitan siswa.
        </p>
      </div>

      {/* threshold_medium */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
          Ambang Batas Perhatian (Skor {form.threshold_medium})
        </label>
        <input
          type="range"
          min={1}
          max={4}
          step={1}
          value={form.threshold_medium}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              threshold_medium: Number(e.target.value),
              // Ensure high stays above medium
              threshold_high: Math.max(f.threshold_high, Number(e.target.value) + 1),
            }))
          }
          className="w-full accent-amber-500"
        />
        <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500">
          <span>1</span>
          <span>4</span>
        </div>
      </div>

      {/* threshold_high */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
          Ambang Batas Darurat (Skor {form.threshold_high})
        </label>
        <input
          type="range"
          min={3}
          max={9}
          step={1}
          value={form.threshold_high}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              threshold_high: Number(e.target.value),
            }))
          }
          className="w-full accent-red-500"
        />
        <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500">
          <span>3</span>
          <span>9</span>
        </div>
      </div>

      {/* notification_enabled toggle */}
      <ToggleRow
        label="Notifikasi ke Guru"
        description="Kirim alert ke guru ketika siswa terdeteksi kesulitan."
        checked={form.notification_enabled}
        onChange={(v) => setForm((f) => ({ ...f, notification_enabled: v }))}
      />

      {/* student_prompt_enabled toggle */}
      <ToggleRow
        label="Prompt Bantuan ke Siswa"
        description="Tampilkan prompt bantuan saat siswa sedang belajar."
        checked={form.student_prompt_enabled}
        onChange={(v) => setForm((f) => ({ ...f, student_prompt_enabled: v }))}
      />

      {/* cooldown_hours */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
          Cooldown Notifikasi (jam)
        </label>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Minimal jeda antara dua alert untuk siswa yang sama pada pelajaran yang sama.
        </p>
        <input
          type="number"
          min={1}
          max={168}
          value={form.cooldown_hours}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              cooldown_hours: Math.max(1, Math.min(168, Number(e.target.value))),
            }))
          }
          className="w-28 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
        </button>

        {saved && (
          <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            Tersimpan
          </span>
        )}

        {updateMutation.isError && (
          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
            Gagal menyimpan. Coba lagi.
          </span>
        )}
      </div>
    </Card>
  );
}

// ----------------------------------------------------------------
// ToggleRow — reusable toggle switch row
// ----------------------------------------------------------------
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {description}
        </p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
          checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
}
