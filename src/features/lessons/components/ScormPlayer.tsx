// SYNC-HINT: {{ = {{ and }} = }}. Sync tool converts automatically.
import { AlertTriangle, Loader2, Package, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/src/contexts/AuthContext'
import { lessonService } from '@/src/features/lessons/api/lessonService'

import {
  createScormBridge,
  type ScormBridge,
  type ScormCommitPayload,
} from '../utils/scormApiBridge'

// ==========================================================================
// ScormPlayer — Renders SCORM 1.2/2004 content in a sandboxed iframe
//
// Integrates into the lesson viewer as a block type ('scorm').
// Manages the SCORM API bridge lifecycle, persists runtime data
// to scorm_runtime_data table, and syncs progress to lesson_progress
// via the upsert_scorm_runtime RPC.
// ==========================================================================

interface ScormPlayerProps {
  scormPackageId: string
  lessonId: string
  onCompletionMet: () => void
}

interface ScormPackage {
  id: string
  tenant_id: string
  lesson_id: string | null
  title: string
  scorm_version: '1.2' | '2004'
  storage_path: string
  entry_point: string
}

type PlayerState = 'loading' | 'ready' | 'error'

export function ScormPlayer({
  scormPackageId,
  lessonId: _lessonId,
  onCompletionMet,
}: ScormPlayerProps) {
  const { user, tenantId } = useAuth()
  const [playerState, setPlayerState] = useState<PlayerState>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [packageInfo, setPackageInfo] = useState<ScormPackage | null>(null)
  const [iframeUrl, setIframeUrl] = useState<string>('')
  const [retryKey, setRetryKey] = useState(0)

  const bridgeRef = useRef<ScormBridge | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const commitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasCalledCompletionRef = useRef(false)

  // ── Persist SCORM state via RPC ──────────────────────────────

  const persistState = useCallback(
    async (payload: ScormCommitPayload) => {
      if (!user || !tenantId) return

      try {
        const params: UpsertScormRuntimeParams = {
          userId: user.id,
          scormPackageId,
          tenantId,
          cmiData: payload.cmiData,
          scoreRaw: payload.scoreRaw,
          scoreMax: payload.scoreMax,
          lessonStatus: payload.lessonStatus,
          totalTimeSeconds: payload.totalTimeSeconds,
          suspendData: payload.suspendData,
        }
        await lessonService.upsertScormRuntime(params)
      } catch (err) {
        console.error('[ScormPlayer] persistState error:', err)
      }
    },
    [user, tenantId, scormPackageId]
  )

  // ── Debounced commit handler ─────────────────────────────────

  const handleCommit = useCallback(
    async (payload: ScormCommitPayload) => {
      // Debounce commits to avoid hammering the DB
      if (commitTimeoutRef.current) {
        clearTimeout(commitTimeoutRef.current)
      }

      commitTimeoutRef.current = setTimeout(async () => {
        await persistState(payload)

        // Check for completion
        const isComplete = payload.lessonStatus === 'completed' || payload.lessonStatus === 'passed'

        if (isComplete && !hasCalledCompletionRef.current) {
          hasCalledCompletionRef.current = true
          onCompletionMet()
        }
      }, 2000) // 2s debounce
    },
    [persistState, onCompletionMet]
  )

  // ── Terminate handler (immediate persist) ────────────────────

  const handleTerminate = useCallback(
    async (payload: ScormCommitPayload) => {
      // Cancel any pending debounced commit
      if (commitTimeoutRef.current) {
        clearTimeout(commitTimeoutRef.current)
        commitTimeoutRef.current = null
      }

      // Persist immediately on terminate
      await persistState(payload)

      const isComplete = payload.lessonStatus === 'completed' || payload.lessonStatus === 'passed'

      if (isComplete && !hasCalledCompletionRef.current) {
        hasCalledCompletionRef.current = true
        onCompletionMet()
      }
    },
    [persistState, onCompletionMet]
  )

  // ── Initialize: fetch package + runtime data ────────────────

  useEffect(() => {
    let cancelled = false

    async function init() {
      if (!user || !tenantId || !scormPackageId) {
        setPlayerState('error')
        setErrorMessage('Data autentikasi tidak lengkap.')
        return
      }

      try {
        setPlayerState('loading')

        // 1. Fetch SCORM package info
        const pkg = await lessonService.getScormPackage(scormPackageId, tenantId!)

        if (!pkg) {
          if (cancelled) return
          setPlayerState('error')
          setErrorMessage('Paket SCORM tidak ditemukan.')
          return
        }

        if (cancelled) return
        setPackageInfo(pkg as ScormPackage)

        // 2. Fetch existing runtime data (for resume)
        const runtime = await lessonService.getScormRuntimeData(user.id, scormPackageId)

        if (cancelled) return

        // 3. Build initial CMI data
        const initialData: Record<string, string> = {}

        if (runtime?.cmi_data) {
          // Restore previous CMI state
          Object.assign(initialData, runtime.cmi_data)
        }

        // Set learner identity (always override with current user)
        if (pkg.scorm_version === '1.2') {
          initialData['cmi.core.student_id'] = user.id
          initialData['cmi.core.student_name'] = user.user_metadata?.full_name || 'Student'
          if (runtime?.suspend_data) {
            initialData['cmi.suspend_data'] = runtime.suspend_data
          }
          if (runtime?.total_time) {
            const h = Math.floor(runtime.total_time / 3600)
            const m = Math.floor((runtime.total_time % 3600) / 60)
            const s = runtime.total_time % 60
            initialData['cmi.core.total_time'] =
              `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
          }
          if (runtime?.lesson_status) {
            initialData['cmi.core.lesson_status'] = runtime.lesson_status
            initialData['cmi.core.entry'] = runtime.lesson_status === 'incomplete' ? 'resume' : ''
          }
        } else {
          // SCORM 2004
          initialData['cmi.learner_id'] = user.id
          initialData['cmi.learner_name'] = user.user_metadata?.full_name || 'Student'
          if (runtime?.suspend_data) {
            initialData['cmi.suspend_data'] = runtime.suspend_data
          }
          if (runtime?.lesson_status) {
            if (runtime.lesson_status === 'passed' || runtime.lesson_status === 'failed') {
              initialData['cmi.completion_status'] = 'completed'
              initialData['cmi.success_status'] = runtime.lesson_status
            } else {
              initialData['cmi.completion_status'] = runtime.lesson_status
              initialData['cmi.success_status'] = 'unknown'
            }
            initialData['cmi.entry'] = runtime.lesson_status === 'incomplete' ? 'resume' : ''
          }
        }

        // 4. Create and attach SCORM bridge
        const bridge = createScormBridge({
          version: pkg.scorm_version as '1.2' | '2004',
          initialData,
          onCommit: handleCommit,
          onTerminate: handleTerminate,
        })

        bridge.attach(window)
        bridgeRef.current = bridge

        // 5. Build iframe URL from Supabase Storage
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
        const contentUrl = `${supabaseUrl}/storage/v1/object/public/scorm-packages/${pkg.storage_path}/${pkg.entry_point}`
        setIframeUrl(contentUrl)

        // Check if already completed
        if (runtime?.lesson_status === 'completed' || runtime?.lesson_status === 'passed') {
          hasCalledCompletionRef.current = true
          onCompletionMet()
        }

        setPlayerState('ready')
      } catch (err) {
        if (cancelled) return
        console.error('[ScormPlayer] init error:', err)
        setPlayerState('error')
        setErrorMessage('Gagal memuat konten SCORM.')
      }
    }

    init()

    return () => {
      cancelled = true
      // Cleanup bridge and pending commits
      if (commitTimeoutRef.current) {
        clearTimeout(commitTimeoutRef.current)
      }
      if (bridgeRef.current) {
        // Flush any unsaved state before detach
        if (bridgeRef.current.isInitialized() && !bridgeRef.current.isTerminated()) {
          const finalPayload = bridgeRef.current.getPayload()
          persistState(finalPayload).catch(() => {})
        }
        bridgeRef.current.detach(window)
        bridgeRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scormPackageId, user?.id, tenantId, retryKey])

  // ── Beforeunload: flush state ────────────────────────────────
  // Uses fetch with keepalive:true instead of sendBeacon because
  // sendBeacon cannot send Authorization headers required by Supabase RPC.
  // keepalive ensures the request completes even after page unload.

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (bridgeRef.current?.isInitialized() && !bridgeRef.current.isTerminated()) {
        const payload = bridgeRef.current.getPayload()
        const body = JSON.stringify({
          p_user_id: user?.id,
          p_scorm_package_id: scormPackageId,
          p_tenant_id: tenantId,
          p_cmi_data: payload.cmiData,
          p_score_raw: payload.scoreRaw,
          p_score_max: payload.scoreMax,
          p_lesson_status: payload.lessonStatus,
          p_total_time: payload.totalTimeSeconds,
          p_suspend_data: payload.suspendData,
        })
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

        // Retrieve the current session token for auth header
        const sessionStr = localStorage.getItem(
          'sb-' + new URL(supabaseUrl).hostname.split('.')[0] + '-auth-token'
        )
        const accessToken = sessionStr ? JSON.parse(sessionStr)?.access_token : anonKey

        try {
          fetch(`${supabaseUrl}/rest/v1/rpc/upsert_scorm_runtime`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: anonKey,
              Authorization: `Bearer ${accessToken || anonKey}`,
            },
            body,
            keepalive: true, // Survives page unload
          })
        } catch {
          // Best-effort — if this fails, the debounced commit already saved recent state
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [user?.id, tenantId, scormPackageId])

  // ── Retry handler ────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    hasCalledCompletionRef.current = false
    setPlayerState('loading')
    setErrorMessage('')
    setIframeUrl('')
    // Increment key to force re-run of the init effect
    setRetryKey((k) => k + 1)
  }, [])

  // ── Render ───────────────────────────────────────────────────

  if (playerState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Memuat konten SCORM...</p>
      </div>
    )
  }

  if (playerState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 gap-4">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-6 w-6" />
          <span className="font-medium">Gagal Memuat SCORM</span>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
          {errorMessage || 'Terjadi kesalahan saat memuat konten SCORM.'}
        </p>
        <button
          onClick={handleRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
                     bg-blue-50 text-blue-700 hover:bg-blue-100
                     dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50
                     transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Coba Lagi
        </button>
      </div>
    )
  }

  return (
    <div className="w-full px-2 sm:px-6 py-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 text-sm text-slate-600 dark:text-slate-400">
        <Package className="h-4 w-4" />
        <span className="font-medium">{packageInfo?.title || 'Modul SCORM'}</span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
          SCORM {packageInfo?.scorm_version}
        </span>
      </div>

      {/* SCORM Content iframe */}
      <div
        className="relative w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
        style={{ minHeight: '500px' }}
      >
        <iframe
          ref={iframeRef}
          src={iframeUrl}
          title={packageInfo?.title || 'Konten SCORM'}
          className="w-full border-0"
          style={{ height: '600px', minHeight: '500px' }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          allow="autoplay; fullscreen"
        />
      </div>

      {/* Status indicator */}
      {hasCalledCompletionRef.current && (
        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          Modul SCORM selesai
        </div>
      )}
    </div>
  )
}
