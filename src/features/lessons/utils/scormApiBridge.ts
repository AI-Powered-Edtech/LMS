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

// ── Types ──────────────────────────────────────────────────────

export interface ScormCommitPayload {
  cmiData: Record<string, string>
  scoreRaw: number | null
  scoreMax: number | null
  lessonStatus: string
  totalTimeSeconds: number
  suspendData: string | null
}

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

// ── SCORM Error Codes ──────────────────────────────────────────

const SCORM_12_ERRORS: Record<string, string> = {
  '0': 'No Error',
  '101': 'General Exception',
  '201': 'Invalid argument error',
  '202': 'Element cannot have children',
  '203': 'Element not an array',
  '301': 'Not initialized',
  '401': 'Not implemented error',
  '402': 'Invalid set value, element is a keyword',
  '403': 'Element is read only',
  '404': 'Element is write only',
}

const SCORM_2004_ERRORS: Record<string, string> = {
  '0': 'No Error',
  '101': 'General Exception',
  '102': 'General Initialization Failure',
  '103': 'Already Initialized',
  '104': 'Content Instance Terminated',
  '111': 'General Termination Failure',
  '112': 'Termination Before Initialization',
  '113': 'Termination After Termination',
  '122': 'Store Data Before Initialization',
  '123': 'Store Data After Termination',
  '132': 'Retrieve Data Before Initialization',
  '133': 'Retrieve Data After Termination',
  '142': 'Commit Before Initialization',
  '143': 'Commit After Termination',
  '201': 'General Argument Error',
  '301': 'General Get Failure',
  '351': 'General Set Failure',
  '391': 'General Commit Failure',
  '401': 'Undefined Data Model Element',
  '402': 'Unimplemented Data Model Element',
  '403': 'Data Model Element Value Not Initialized',
  '404': 'Data Model Element Is Read Only',
  '405': 'Data Model Element Is Write Only',
  '406': 'Data Model Element Type Mismatch',
  '407': 'Data Model Element Value Out Of Range',
  '408': 'Data Model Dependency Not Established',
}

// ── CMI Data Store ─────────────────────────────────────────────

class CmiDataStore {
  private data: Record<string, string>

  constructor(initialData: Record<string, string> = {}) {
    this.data = { ...initialData }
  }

  get(key: string): string | undefined {
    return this.data[key]
  }

  set(key: string, value: string): void {
    this.data[key] = value
  }

  getAll(): Record<string, string> {
    return { ...this.data }
  }
}

// ── Time Parsing ───────────────────────────────────────────────

/**
 * Parse SCORM 1.2 time format (HH:MM:SS.SS) to seconds.
 */
function parseScorm12Time(timeStr: string): number {
  if (!timeStr) return 0
  const parts = timeStr.split(':')
  if (parts.length !== 3) return 0
  const hours = parseInt(parts[0], 10) || 0
  const minutes = parseInt(parts[1], 10) || 0
  const seconds = parseFloat(parts[2]) || 0
  return hours * 3600 + minutes * 60 + Math.round(seconds)
}

/**
 * Parse SCORM 2004 time format (ISO 8601 duration: PT1H30M20S) to seconds.
 */
function parseScorm2004Time(timeStr: string): number {
  if (!timeStr) return 0
  const match = timeStr.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?$/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseFloat(match[3] || '0')
  return hours * 3600 + minutes * 60 + Math.round(seconds)
}

/**
 * Format seconds as SCORM 1.2 time (HH:MM:SS).
 */
export function formatScorm12Time(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Format seconds as SCORM 2004 ISO 8601 duration.
 */
export function formatScorm2004Time(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  let result = 'PT'
  if (hours > 0) result += `${hours}H`
  if (minutes > 0) result += `${minutes}M`
  result += `${seconds}S`
  return result
}

// ── Extract Payload ────────────────────────────────────────────

function extractPayload(store: CmiDataStore, version: '1.2' | '2004'): ScormCommitPayload {
  const data = store.getAll()

  let scoreRaw: number | null = null
  let scoreMax: number | null = null
  let lessonStatus = 'incomplete'
  let totalTimeSeconds = 0
  let suspendData: string | null = null

  if (version === '1.2') {
    const rawStr = data['cmi.core.score.raw']
    if (rawStr !== undefined && rawStr !== '') scoreRaw = parseFloat(rawStr)

    const maxStr = data['cmi.core.score.max']
    if (maxStr !== undefined && maxStr !== '') scoreMax = parseFloat(maxStr)

    lessonStatus = data['cmi.core.lesson_status'] || 'incomplete'
    totalTimeSeconds = parseScorm12Time(data['cmi.core.total_time'] || '')
    suspendData = data['cmi.suspend_data'] ?? null

    // Also accumulate session_time
    const sessionTime = data['cmi.core.session_time']
    if (sessionTime) {
      totalTimeSeconds += parseScorm12Time(sessionTime)
    }
  } else {
    // SCORM 2004
    const rawStr = data['cmi.score.raw']
    if (rawStr !== undefined && rawStr !== '') scoreRaw = parseFloat(rawStr)

    const maxStr = data['cmi.score.max']
    if (maxStr !== undefined && maxStr !== '') scoreMax = parseFloat(maxStr)

    const completionStatus = data['cmi.completion_status'] || 'incomplete'
    const successStatus = data['cmi.success_status'] || 'unknown'

    // Map SCORM 2004 dual-status to a single status
    if (completionStatus === 'completed' && successStatus === 'passed') {
      lessonStatus = 'passed'
    } else if (completionStatus === 'completed' && successStatus === 'failed') {
      lessonStatus = 'failed'
    } else if (completionStatus === 'completed') {
      lessonStatus = 'completed'
    } else if (successStatus === 'failed') {
      lessonStatus = 'failed'
    } else {
      lessonStatus = 'incomplete'
    }

    totalTimeSeconds = parseScorm2004Time(data['cmi.total_time'] || '')
    suspendData = data['cmi.suspend_data'] ?? null

    const sessionTime = data['cmi.session_time']
    if (sessionTime) {
      totalTimeSeconds += parseScorm2004Time(sessionTime)
    }
  }

  return {
    cmiData: data,
    scoreRaw,
    scoreMax,
    lessonStatus,
    totalTimeSeconds,
    suspendData,
  }
}

// ── Read-only CMI Elements ─────────────────────────────────────

const READ_ONLY_12 = new Set([
  'cmi.core._children',
  'cmi.core.student_id',
  'cmi.core.student_name',
  'cmi.core.credit',
  'cmi.core.entry',
  'cmi.core.total_time',
  'cmi.core.score._children',
  'cmi.launch_data',
  'cmi.comments_from_lms',
  'cmi.student_data._children',
  'cmi.student_data.mastery_score',
  'cmi.student_data.max_time_allowed',
  'cmi.student_data.time_limit_action',
])

const READ_ONLY_2004 = new Set([
  'cmi._version',
  'cmi.completion_threshold',
  'cmi.credit',
  'cmi.entry',
  'cmi.launch_data',
  'cmi.learner_id',
  'cmi.learner_name',
  'cmi.max_time_allowed',
  'cmi.mode',
  'cmi.scaled_passing_score',
  'cmi.time_limit_action',
  'cmi.total_time',
])

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
      onTerminate(payload).catch((err) => console.error('[ScormBridge] Terminate error:', err))

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

      onCommit(payload).catch((err) => console.error('[ScormBridge] Commit error:', err))

      return 'true'
    },

    LMSGetLastError(): string {
      return lastError
    },

    LMSGetErrorString(errorCode: string): string {
      return SCORM_12_ERRORS[errorCode] || 'Unknown Error'
    },

    LMSGetDiagnostic(errorCode: string): string {
      return `Error code: ${errorCode}. ${SCORM_12_ERRORS[errorCode] || 'No diagnostic info available.'}`
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

      onTerminate(payload).catch((err) => console.error('[ScormBridge] Terminate error:', err))

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

      onCommit(payload).catch((err) => console.error('[ScormBridge] Commit error:', err))

      return 'true'
    },

    GetLastError(): string {
      return lastError
    },

    GetErrorString(errorCode: string): string {
      return SCORM_2004_ERRORS[errorCode] || 'Unknown Error'
    },

    GetDiagnostic(errorCode: string): string {
      return `Error code: ${errorCode}. ${SCORM_2004_ERRORS[errorCode] || 'No diagnostic info available.'}`
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
