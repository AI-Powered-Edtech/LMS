import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X } from 'lucide-react'
import { cn } from '@/src/utils/cn'
import { useAuth } from '@/src/contexts/AuthContext'
import { supabase } from '@/src/services/supabase/client'
import { ONBOARDING_STEPS, OnboardingProgress } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcProgress(stepsCompleted: Record<string, boolean>): number {
  const total = ONBOARDING_STEPS.length
  const done = ONBOARDING_STEPS.filter((s) => stepsCompleted[s.id]).length
  return Math.round((done / total) * 100)
}

// ---------------------------------------------------------------------------
// Inner component — rendered only for admin users with a tenant
// ---------------------------------------------------------------------------

interface InnerProps {
  tenantId: string
  userId: string
}

function OnboardingChecklistInner({ tenantId, userId }: InnerProps) {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const fetchProgress = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('onboarding_progress')
      .select('id, tenant_id, user_id, steps_completed, completed_at')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .maybeSingle()

    if (data) {
      setProgress(data as OnboardingProgress)
    } else {
      // Upsert a fresh record for this admin
      const { data: created } = await supabase
        .from('onboarding_progress')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          steps_completed: {},
          completed_at: null,
        })
        .select()
        .single()
      if (created) setProgress(created as OnboardingProgress)
    }
    setLoading(false)
  }, [tenantId, userId])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  const stepsCompleted = progress?.steps_completed ?? {}
  const pct = calcProgress(stepsCompleted)
  const allDone = pct === 100

  if (allDone || dismissed || loading) return null

  const handleToggleStep = async (stepId: string) => {
    if (!progress) return

    const updated: Record<string, boolean> = {
      ...stepsCompleted,
      [stepId]: !stepsCompleted[stepId],
    }
    const allComplete = ONBOARDING_STEPS.every((s) => updated[s.id])

    const { data } = await supabase
      .from('onboarding_progress')
      .update({
        steps_completed: updated,
        completed_at: allComplete ? new Date().toISOString() : null,
      })
      .eq('id', progress.id)
      .select()
      .single()

    if (data) setProgress(data as OnboardingProgress)
  }

  const doneSoFar = ONBOARDING_STEPS.filter((s) => stepsCompleted[s.id]).length

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-40 w-80',
        'bg-white dark:bg-slate-900',
        'border border-slate-200 dark:border-slate-700/60',
        'rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-black/40',
        'animate-in slide-in-from-bottom-4 duration-300'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Penyiapan Akun</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Tampilkan daftar' : 'Sembunyikan daftar'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Tutup sementara"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {doneSoFar} dari {ONBOARDING_STEPS.length} selesai
          </span>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{pct}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Steps list */}
      {!collapsed && (
        <ul className="px-4 py-3 space-y-2">
          {ONBOARDING_STEPS.map((step) => {
            const done = Boolean(stepsCompleted[step.id])
            return (
              <li key={step.id} className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleStep(step.id)}
                  aria-label={
                    done ? `Tandai "${step.title}" belum selesai` : `Selesaikan "${step.title}"`
                  }
                  className="mt-0.5 shrink-0 text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                >
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
                <div className="min-w-0">
                  <a
                    href={step.href}
                    className={cn(
                      'block text-sm font-semibold leading-snug',
                      done
                        ? 'text-slate-400 dark:text-slate-500 line-through'
                        : 'text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400'
                    )}
                  >
                    {step.title}
                  </a>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {step.description}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Footer dismiss */}
      {!collapsed && (
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="w-full text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors py-1"
          >
            Tutup sementara
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Public wrapper — guards role + auth before mounting inner component
// ---------------------------------------------------------------------------

export function OnboardingChecklist() {
  const { role, tenantId, user } = useAuth()

  if (role !== 'admin' || !tenantId || !user) return null

  return <OnboardingChecklistInner tenantId={tenantId} userId={user.id} />
}
