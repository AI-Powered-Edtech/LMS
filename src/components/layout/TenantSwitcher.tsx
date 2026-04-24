import { Building2, Check, ChevronDown, Home, Loader2 } from 'lucide-react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'

import { Role, useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'

// ============================================================
// Role labels (Indonesia)
// ============================================================

const ROLE_LABEL: Record<Role, string> = {
  student: 'Siswa',
  teacher: 'Guru',
  admin: 'Admin',
  parent: 'Ortu',
  principal: 'Kepsek',
  wakasek: 'Wakasek',
  wali_kelas: 'Wali Kelas',
  guru_bk: 'Guru BK',
  tu: 'Tata Usaha',
  yayasan: 'Yayasan',
  pengawas: 'Pengawas',
}

// ============================================================
// TenantSwitcher
//
// Chip “Tenant · Peran” + dropdown ruang kerja. Tampil hanya ketika user
// punya >= 1 membership aktif. Mengganti tenant dilakukan via
// `useAuth().setActiveTenant`.
// ============================================================

export const TenantSwitcher = memo(function TenantSwitcher() {
  const { memberships, activeTenant, activeRole, setActiveTenant } = useAuth()
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close on outside click / Escape
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const activeMemberships = useMemo(() => {
    const active = memberships.filter((m) => m.status === 'active' && m.is_active)
    // Dedupe by tenant_id — backend may return multiple membership rows for the
    // same tenant (e.g. same user holding admin + teacher role). Prefer the row
    // whose role matches the currently-active role, else keep first occurrence.
    const byTenant = new Map<string, (typeof active)[number]>()
    for (const m of active) {
      const existing = byTenant.get(m.tenant_id)
      if (!existing) {
        byTenant.set(m.tenant_id, m)
      } else if (m.role === activeRole && existing.role !== activeRole) {
        byTenant.set(m.tenant_id, m)
      }
    }
    return Array.from(byTenant.values())
  }, [memberships, activeRole])

  // Fallback chip when no active tenant yet
  if (!activeTenant || activeMemberships.length === 0) {
    return null
  }

  const canSwitch = activeMemberships.length > 1

  const handleSelect = async (tenantId: string) => {
    if (tenantId === activeTenant.id) {
      setOpen(false)
      return
    }
    try {
      setBusyId(tenantId)
      await setActiveTenant(tenantId)
    } catch {
      // Error toast is surfaced by AuthContext
    } finally {
      setBusyId(null)
      setOpen(false)
    }
  }

  const tenantName = activeTenant.name || 'Ruang Kerja'
  const roleLabel = activeRole ? ROLE_LABEL[activeRole] : null

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Ganti ruang kerja"
        disabled={!canSwitch && !open}
        onClick={() => canSwitch && setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium text-xs md:text-sm border transition-colors',
          'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30',
          'text-indigo-700 dark:text-indigo-300',
          'border-indigo-200/60 dark:border-indigo-800/40',
          canSwitch
            ? 'hover:from-indigo-100 hover:to-blue-100 dark:hover:from-indigo-900/50 dark:hover:to-blue-900/50 cursor-pointer'
            : 'opacity-90 cursor-default'
        )}
      >
        <Building2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="max-w-[10rem] md:max-w-[14rem] truncate">{tenantName}</span>
        {roleLabel && (
          <>
            <span aria-hidden="true" className="text-indigo-400/70">·</span>
            <span className="font-semibold">{roleLabel}</span>
          </>
        )}
        {canSwitch && (
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 ml-0.5 transition-transform',
              open && 'rotate-180'
            )}
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Ruang kerja tersedia"
          className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden z-50"
        >
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
              Ruang Kerja
            </p>
          </div>
          <ul className="max-h-80 overflow-auto py-1">
            {activeMemberships.map((m) => {
              const isActive = m.tenant_id === activeTenant.id
              const isBusy = busyId === m.tenant_id
              return (
                <li key={m.tenant_id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    disabled={isBusy}
                    onClick={() => void handleSelect(m.tenant_id)}
                    className={cn(
                      'w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors',
                      isActive && 'bg-indigo-50/70 dark:bg-indigo-900/20'
                    )}
                  >
                    <div className="w-8 h-8 shrink-0 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
                      {m.tenant_slug?.startsWith('personal-') ? (
                        <Home className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Building2 className="w-4 h-4" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {m.tenant_name}
                        </p>
                        {isActive && (
                          <Check
                            className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0"
                            aria-label="Aktif"
                          />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {ROLE_LABEL[m.role] ?? m.role}
                        {m.tenant_slug && (
                          <>
                            <span className="mx-1">·</span>
                            <span className="font-mono text-[11px]">{m.tenant_slug}</span>
                          </>
                        )}
                      </p>
                    </div>
                    {isBusy && (
                      <Loader2
                        className="w-4 h-4 animate-spin text-indigo-500 mt-2 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
})
