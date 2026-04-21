import { logger } from '@/utils/logger'

// ==========================================================================
// SCORM API Bridge — scormApiBridge.ts
//
// Creates SCORM 1.2 (window.API) and SCORM 2004 (window.API_1484_11)
// runtime API objects that mediate between the SCORM content inside an
// iframe and EduSync's persistence layer.
//
// Usage:
//   const bridge = createScormBridge({ version, initialData, onCommit, onTerminate })
//   bridge.attach(window)  // injects API onto window object
//   bridge.detach(window)  // cleanup on unmount
// ==========================================================================
import { CmiDataStore, extractPayload, READ_ONLY_12, READ_ONLY_2004 } from './scormDataModel'
import {
  getScorm12Diagnostic,
  getScorm12ErrorString,
  getScorm2004Diagnostic,
  getScorm2004ErrorString,
} from './scormErrorHandler'
import type { ScormCommitPayload } from './scormDataModel'

// ── Types ──────────────────────────────────────────────────────

export interface ScormBridgeOptions {
  version: '1.2' | '2004'
  initialData: Record<string, string>
  onCommit: (payload: ScormCommitPayload) => Promise<void>
  onTerminate: (payload: ScormCommitPayload) => Promise<void>
}

export interface ScormBridge {
  attach: (targetWindow: Window) => void
  detach: (targetWindow: Window) => void
  getPayload: () => ScormCommitPayload
  isInitialized: () => boolean
  isTerminated: () => boolean
}

// Re-export utilities from submodules for consumers that imported them from here
export { formatScorm12Time, formatScorm2004Time } from './scormDataModel'

// ── Factory ────────────────────────────────────────────────────

export function createScormBridge(options: ScormBridgeOptions): ScormBridge {
  const { version, initialData, onCommit, onTerminate } = options
  const store = new CmiDataStore(initialData)
  let lastError = '0'
  let initialized = false
  let terminated = false

  function setError(code: string): void {
    lastError = code
  }

  // ── SCORM 1.2 API ──

  const scorm12Api = {
    LMSInitialize(_param: string): string {
      if (initialized) {
        setError('101')
        return 'false'
      }
      initialized = true
      terminated = false
      setError('0')
      return 'true'
    },

    LMSFinish(_param: string): string {
      if (!initialized) {
        setError('301')
        return 'false'
      }

      const payload = extractPayload(store, '1.2')
      terminated = true
      initialized = false
      setError('0')

      // Fire async, don't block the content
      onTerminate(payload).catch((err) => logger.error('[ScormBridge] Terminate error:', err))

      return 'true'
    },

    LMSGetValue(element: string): string {
      if (!initialized) {
        setError('301')
        return ''
      }

      setError('0')
      const value = store.get(element)
      return value ?? ''
    },

    LMSSetValue(element: string, value: string): string {
      if (!initialized) {
        setError('301')
        return 'false'
      }

      if (READ_ONLY_12.has(element)) {
        setError('403')
        return 'false'
      }

      store.set(element, value)
      setError('0')
      return 'true'
    },

    LMSCommit(_param: string): string {
      if (!initialized) {
        setError('301')
        return 'false'
      }

      const payload = extractPayload(store, '1.2')
      setError('0')

      onCommit(payload).catch((err) => logger.error('[ScormBridge] Commit error:', err))

      return 'true'
    },

    LMSGetLastError(): string {
      return lastError
    },

    LMSGetErrorString(errorCode: string): string {
      return getScorm12ErrorString(errorCode)
    },

    LMSGetDiagnostic(errorCode: string): string {
      return getScorm12Diagnostic(errorCode)
    },
  }

  // ── SCORM 2004 API ──

  const scorm2004Api = {
    Initialize(_param: string): string {
      if (initialized) {
        setError('103')
        return 'false'
      }
      if (terminated) {
        setError('104')
        return 'false'
      }

      initialized = true
      terminated = false
      setError('0')
      return 'true'
    },

    Terminate(_param: string): string {
      if (!initialized) {
        setError('112')
        return 'false'
      }
      if (terminated) {
        setError('113')
        return 'false'
      }

      const payload = extractPayload(store, '2004')
      terminated = true
      initialized = false
      setError('0')

      onTerminate(payload).catch((err) => logger.error('[ScormBridge] Terminate error:', err))

      return 'true'
    },

    GetValue(element: string): string {
      if (!initialized) {
        setError('132')
        return ''
      }
      if (terminated) {
        setError('133')
        return ''
      }

      setError('0')
      return store.get(element) ?? ''
    },

    SetValue(element: string, value: string): string {
      if (!initialized) {
        setError('122')
        return 'false'
      }
      if (terminated) {
        setError('123')
        return 'false'
      }

      if (READ_ONLY_2004.has(element)) {
        setError('404')
        return 'false'
      }

      store.set(element, value)
      setError('0')
      return 'true'
    },

    Commit(_param: string): string {
      if (!initialized) {
        setError('142')
        return 'false'
      }
      if (terminated) {
        setError('143')
        return 'false'
      }

      const payload = extractPayload(store, '2004')
      setError('0')

      onCommit(payload).catch((err) => logger.error('[ScormBridge] Commit error:', err))

      return 'true'
    },

    GetLastError(): string {
      return lastError
    },

    GetErrorString(errorCode: string): string {
      return getScorm2004ErrorString(errorCode)
    },

    GetDiagnostic(errorCode: string): string {
      return getScorm2004Diagnostic(errorCode)
    },
  }

  return {
    attach(targetWindow: Window) {
      if (version === '1.2') {
        ;(targetWindow as unknown as Record<string, unknown>).API = scorm12Api
      } else {
        ;(targetWindow as unknown as Record<string, unknown>).API_1484_11 = scorm2004Api
      }

      // Some SCORM content looks for the API on parent frames.
      // We attach to the provided window so the iframe's parent lookup finds it.
    },

    detach(targetWindow: Window) {
      if (version === '1.2') {
        delete (targetWindow as unknown as Record<string, unknown>).API
      } else {
        delete (targetWindow as unknown as Record<string, unknown>).API_1484_11
      }
    },

    getPayload(): ScormCommitPayload {
      return extractPayload(store, version)
    },

    isInitialized(): boolean {
      return initialized
    },

    isTerminated(): boolean {
      return terminated
    },
  }
}
