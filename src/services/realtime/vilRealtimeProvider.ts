// ─────────────────────────────────────────────────────────────────────────────
// VIL WebSocket Realtime Provider
//
// Implementasi nyata dari RealtimeProvider yang menggunakan koneksi WebSocket
// ke server Rust (VIL backend), bukan Supabase Realtime.
//
// Semua saluran berbagi SATU koneksi WebSocket (multiplexed).
// Rekoneksi otomatis dengan exponential backoff.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AppRealtimeChannel,
  PostgresChangesFilter,
  PostgresChangesPayload,
  RealtimeChannelOptions,
  RealtimeChannelStatus,
  RealtimeProvider,
} from './types'

// ─── Konfigurasi ──────────────────────────────────────────────────────────────

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8080/ws'
const MAX_RETRIES = 10
const BACKOFF_BASE_MS = 1000
const BACKOFF_MAX_MS = 30000

const IS_DEV = import.meta.env.DEV

// ─── Tipe pesan protokol WebSocket ───────────────────────────────────────────

interface ClientJoinMessage {
  type: 'join'
  channel: string
}

interface ClientLeaveMessage {
  type: 'leave'
  channel: string
}

interface ClientBroadcastMessage {
  type: 'broadcast'
  channel: string
  event: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
}

interface ClientTrackMessage {
  type: 'track'
  channel: string
  payload: Record<string, unknown>
}

interface ClientUntrackMessage {
  type: 'untrack'
  channel: string
}

interface ClientPingMessage {
  type: 'ping'
}

type ClientMessage =
  | ClientJoinMessage
  | ClientLeaveMessage
  | ClientBroadcastMessage
  | ClientTrackMessage
  | ClientUntrackMessage
  | ClientPingMessage

// ─── Tipe pesan dari server ───────────────────────────────────────────────────

interface ServerSystemMessage {
  type: 'system'
  channel: string
  event: 'SUBSCRIBED' | 'CLOSED'
}

interface ServerBroadcastMessage {
  type: 'broadcast'
  channel: string
  event: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
}

interface ServerPresenceSyncMessage {
  type: 'presence_sync'
  channel: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: Record<string, any[]>
}

interface ServerPostgresChangesMessage {
  type: 'postgres_changes'
  channel: string
  payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
    table: string
    schema?: string
    commit_timestamp?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new: Record<string, any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    old: Record<string, any>
    errors?: string[] | null
  }
}

interface ServerPongMessage {
  type: 'pong'
}

interface ServerErrorMessage {
  type: 'error'
  message: string
}

type ServerMessage =
  | ServerSystemMessage
  | ServerBroadcastMessage
  | ServerPresenceSyncMessage
  | ServerPostgresChangesMessage
  | ServerPongMessage
  | ServerErrorMessage

// ─── Handler terdaftar di saluran ─────────────────────────────────────────────

type PostgresChangesHandler = {
  kind: 'postgres_changes'
  filter: PostgresChangesFilter
  callback: (payload: PostgresChangesPayload) => void
}

type BroadcastHandler = {
  kind: 'broadcast'
  event: string
  callback: (payload: { payload: unknown }) => void
}

type PresenceHandler = {
  kind: 'presence'
  event: 'sync' | 'join' | 'leave'
  callback: (payload?: unknown) => void
}

type ChannelHandler = PostgresChangesHandler | BroadcastHandler | PresenceHandler

// ─── Implementasi saluran ─────────────────────────────────────────────────────

class VilChannel implements AppRealtimeChannel {
  private handlers: ChannelHandler[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private presenceState_: Record<string, any[]> = {}
  private subscribeCallback?: (status: RealtimeChannelStatus, err?: Error) => void
  private trackedPayload?: Record<string, unknown>

  constructor(
    readonly name: string,
    private readonly sendRaw: (msg: ClientMessage) => void
  ) {}

  // ─── Implementasi AppRealtimeChannel ───────────────────────────────────────

  on(
    type: 'postgres_changes',
    filter: PostgresChangesFilter,
    callback: (payload: PostgresChangesPayload) => void
  ): this
  on(
    type: 'broadcast',
    filter: { event: string },
    callback: (payload: { payload: unknown }) => void
  ): this
  on(
    type: 'presence',
    filter: { event: 'sync' | 'join' | 'leave' },
    callback: (payload?: unknown) => void
  ): this
  on(
    type: 'postgres_changes' | 'broadcast' | 'presence',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filter: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback: any
  ): this {
    if (type === 'postgres_changes') {
      this.handlers.push({ kind: 'postgres_changes', filter, callback })
    } else if (type === 'broadcast') {
      this.handlers.push({ kind: 'broadcast', event: filter.event, callback })
    } else if (type === 'presence') {
      this.handlers.push({ kind: 'presence', event: filter.event, callback })
    }
    return this
  }

  subscribe(callback?: (status: RealtimeChannelStatus, err?: Error) => void): this {
    this.subscribeCallback = callback
    // Kirim pesan join ke server
    this.sendRaw({ type: 'join', channel: this.name })
    if (IS_DEV) {
      console.debug(`[VilRealtime] Bergabung ke saluran: ${this.name}`)
    }
    return this
  }

  async unsubscribe(): Promise<'ok' | 'timed out' | 'error'> {
    try {
      this.sendRaw({ type: 'leave', channel: this.name })
      if (IS_DEV) {
        console.debug(`[VilRealtime] Meninggalkan saluran: ${this.name}`)
      }
      return 'ok'
    } catch {
      return 'error'
    }
  }

  async send(payload: {
    type: string
    event: string
    payload: unknown
  }): Promise<'ok' | 'timed out' | 'error'> {
    try {
      this.sendRaw({
        type: 'broadcast',
        channel: this.name,
        event: payload.event,
        payload: payload.payload,
      })
      return 'ok'
    } catch {
      return 'error'
    }
  }

  async track(payload: Record<string, unknown>): Promise<'ok' | 'timed out' | 'error'> {
    try {
      this.trackedPayload = payload
      this.sendRaw({ type: 'track', channel: this.name, payload })
      return 'ok'
    } catch {
      return 'error'
    }
  }

  async untrack(): Promise<'ok' | 'timed out' | 'error'> {
    try {
      this.trackedPayload = undefined
      this.sendRaw({ type: 'untrack', channel: this.name })
      return 'ok'
    } catch {
      return 'error'
    }
  }

  presenceState<T = Record<string, unknown>>(): Record<string, T[]> {
    return this.presenceState_ as Record<string, T[]>
  }

  // ─── Digunakan oleh koneksi WebSocket induk ───────────────────────────────

  /**
   * Dipanggil saat koneksi WebSocket terhubung kembali setelah terputus.
   * Re-join saluran dan re-track presence jika ada.
   */
  rejoin(): void {
    this.sendRaw({ type: 'join', channel: this.name })
    if (this.trackedPayload) {
      this.sendRaw({ type: 'track', channel: this.name, payload: this.trackedPayload })
    }
    if (IS_DEV) {
      console.debug(`[VilRealtime] Re-join saluran setelah koneksi ulang: ${this.name}`)
    }
  }

  /**
   * Dirutekan dari koneksi WebSocket saat pesan masuk untuk saluran ini.
   */
  handleIncoming(msg: ServerMessage): void {
    switch (msg.type) {
      case 'system':
        this.handleSystem(msg)
        break
      case 'broadcast':
        this.handleBroadcast(msg)
        break
      case 'postgres_changes':
        this.handlePostgresChanges(msg)
        break
      case 'presence_sync':
        this.handlePresenceSync(msg)
        break
      case 'pong':
      case 'error':
        // Ditangani di tingkat koneksi
        break
    }
  }

  private handleSystem(msg: ServerSystemMessage): void {
    if (msg.event === 'SUBSCRIBED') {
      if (IS_DEV) {
        console.debug(`[VilRealtime] Saluran berhasil berlangganan: ${this.name}`)
      }
      this.subscribeCallback?.('SUBSCRIBED')
    } else if (msg.event === 'CLOSED') {
      if (IS_DEV) {
        console.debug(`[VilRealtime] Saluran ditutup oleh server: ${this.name}`)
      }
      this.subscribeCallback?.('CLOSED')
    }
  }

  private handleBroadcast(msg: ServerBroadcastMessage): void {
    for (const handler of this.handlers) {
      if (handler.kind === 'broadcast' && handler.event === msg.event) {
        handler.callback({ payload: msg.payload })
      }
    }
  }

  private handlePostgresChanges(msg: ServerPostgresChangesMessage): void {
    const incomingPayload: PostgresChangesPayload = {
      schema: msg.payload.schema ?? 'public',
      table: msg.payload.table,
      commit_timestamp: msg.payload.commit_timestamp ?? new Date().toISOString(),
      eventType: msg.payload.eventType,
      new: msg.payload.new,
      old: msg.payload.old,
      errors: msg.payload.errors ?? null,
    }

    for (const handler of this.handlers) {
      if (handler.kind !== 'postgres_changes') continue

      const f = handler.filter

      // Cocokkan tabel
      if (f.table !== '*' && f.table !== incomingPayload.table) continue

      // Cocokkan event (INSERT/UPDATE/DELETE atau wildcard *)
      if (f.event !== '*' && f.event !== incomingPayload.eventType) continue

      // Cocokkan skema
      if (f.schema !== incomingPayload.schema) continue

      handler.callback(incomingPayload)
    }
  }

  private handlePresenceSync(msg: ServerPresenceSyncMessage): void {
    const prevState = this.presenceState_
    this.presenceState_ = msg.state

    // Panggil handler 'sync' dengan state terbaru
    for (const handler of this.handlers) {
      if (handler.kind === 'presence' && handler.event === 'sync') {
        handler.callback(msg.state)
      }
    }

    // Hitung join dan leave berdasarkan perubahan state
    const prevKeys = new Set(Object.keys(prevState))
    const newKeys = new Set(Object.keys(msg.state))

    const joined: Record<string, unknown[]> = {}
    const left: Record<string, unknown[]> = {}

    for (const key of newKeys) {
      if (!prevKeys.has(key)) {
        joined[key] = msg.state[key]
      }
    }
    for (const key of prevKeys) {
      if (!newKeys.has(key)) {
        left[key] = prevState[key]
      }
    }

    if (Object.keys(joined).length > 0) {
      for (const handler of this.handlers) {
        if (handler.kind === 'presence' && handler.event === 'join') {
          handler.callback({ joins: joined, leaves: {} })
        }
      }
    }

    if (Object.keys(left).length > 0) {
      for (const handler of this.handlers) {
        if (handler.kind === 'presence' && handler.event === 'leave') {
          handler.callback({ joins: {}, leaves: left })
        }
      }
    }
  }
}

// ─── Perhitungan backoff eksponensial ─────────────────────────────────────────

function calcBackoff(attempt: number): number {
  // attempt 0 → 1000ms, attempt 1 → 2000ms, ..., max 30000ms
  return Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt), BACKOFF_MAX_MS)
}

// ─── Manajemen koneksi WebSocket ──────────────────────────────────────────────

interface WsConnection {
  ws: WebSocket | null
  channels: Map<string, VilChannel>
  retryAttempt: number
  retryTimer: ReturnType<typeof setTimeout> | null
  destroyed: boolean
  pingInterval: ReturnType<typeof setInterval> | null
}

function getToken(): string | null {
  // Baca JWT dari localStorage (kunci yang digunakan oleh Supabase)
  try {
    const raw = localStorage.getItem('sb-access-token') ?? localStorage.getItem('access_token')
    if (raw) return raw

    // Coba ambil dari sesi Supabase yang tersimpan (format: sb-{ref}-auth-token)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes('-auth-token')) {
        const val = localStorage.getItem(key)
        if (val) {
          try {
            const parsed = JSON.parse(val) as { access_token?: string }
            if (parsed.access_token) return parsed.access_token
          } catch {
            // Abaikan kesalahan parse
          }
        }
      }
    }
  } catch {
    // Abaikan jika localStorage tidak tersedia
  }
  return null
}

function buildWsUrl(baseUrl: string): string {
  const token = getToken()
  if (!token) return baseUrl
  const sep = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${sep}token=${encodeURIComponent(token)}`
}

function createConnection(conn: WsConnection, baseUrl: string, onReady?: () => void): void {
  if (conn.destroyed) return

  const url = buildWsUrl(baseUrl)

  if (IS_DEV) {
    console.debug(
      `[VilRealtime] Menghubungkan ke WebSocket: ${baseUrl} (percobaan: ${conn.retryAttempt})`
    )
  }

  const ws = new WebSocket(url)
  conn.ws = ws

  ws.onopen = () => {
    if (conn.destroyed) {
      ws.close()
      return
    }
    conn.retryAttempt = 0
    if (IS_DEV) {
      console.debug('[VilRealtime] Koneksi WebSocket berhasil')
    }

    // Mulai interval ping untuk menjaga koneksi tetap hidup
    if (conn.pingInterval) clearInterval(conn.pingInterval)
    conn.pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        sendMessage(ws, { type: 'ping' })
      }
    }, 30000)

    // Re-join semua saluran yang sudah berlangganan
    for (const channel of conn.channels.values()) {
      channel.rejoin()
    }

    // Flush pesan yang diantrekan sebelum koneksi siap
    onReady?.()
  }

  ws.onmessage = (event) => {
    if (conn.destroyed) return
    let msg: ServerMessage
    try {
      msg = JSON.parse(event.data as string) as ServerMessage
    } catch {
      if (IS_DEV) {
        console.warn('[VilRealtime] Gagal mengurai pesan JSON:', event.data)
      }
      return
    }

    if (IS_DEV && msg.type !== 'pong') {
      console.debug('[VilRealtime] Pesan masuk:', msg)
    }

    if (msg.type === 'pong') return

    if (msg.type === 'error') {
      console.error('[VilRealtime] Error dari server:', msg.message)
      return
    }

    // Rutekan pesan ke saluran yang tepat
    if ('channel' in msg && msg.channel) {
      const channel = conn.channels.get(msg.channel)
      if (channel) {
        channel.handleIncoming(msg)
      } else if (IS_DEV) {
        console.debug(`[VilRealtime] Pesan untuk saluran tidak dikenal: ${msg.channel}`)
      }
    }
  }

  ws.onerror = (event) => {
    if (IS_DEV) {
      console.warn('[VilRealtime] Kesalahan WebSocket:', event)
    }
  }

  ws.onclose = (event) => {
    if (conn.destroyed) return
    conn.ws = null

    if (conn.pingInterval) {
      clearInterval(conn.pingInterval)
      conn.pingInterval = null
    }

    if (IS_DEV) {
      console.warn(
        `[VilRealtime] Koneksi terputus (kode: ${event.code}). Mencoba ulang dalam ${calcBackoff(conn.retryAttempt)}ms...`
      )
    }

    // Beritahu semua saluran bahwa koneksi terputus
    for (const channel of conn.channels.values()) {
      // Panggil subscribeCallback dengan CHANNEL_ERROR agar consumer hooks
      // dapat merespons pemutusan koneksi
      channel.handleIncoming({
        type: 'system',
        channel: channel.name,
        event: 'CLOSED',
      })
    }

    // Jadwalkan rekoneksi jika belum melebihi batas percobaan
    if (conn.retryAttempt < MAX_RETRIES) {
      const delay = calcBackoff(conn.retryAttempt)
      conn.retryAttempt += 1
      conn.retryTimer = setTimeout(() => {
        if (!conn.destroyed) {
          createConnection(conn, baseUrl, onReady)
        }
      }, delay)
    } else {
      console.error(
        `[VilRealtime] Melebihi batas percobaan koneksi ulang (${MAX_RETRIES}). Berhenti mencoba ulang.`
      )
    }
  }
}

function sendMessage(ws: WebSocket, msg: ClientMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
  }
}

// ─── Factory createVilRealtimeProvider ───────────────────────────────────────

export function createVilRealtimeProvider(baseUrl?: string): RealtimeProvider {
  const wsBaseUrl = baseUrl ?? WS_URL

  // Status koneksi bersama untuk semua saluran
  const conn: WsConnection = {
    ws: null,
    channels: new Map<string, VilChannel>(),
    retryAttempt: 0,
    retryTimer: null,
    destroyed: false,
    pingInterval: null,
  }

  // Fungsi kirim yang aman — mengantre pesan jika WS belum terbuka
  const pendingMessages: ClientMessage[] = []

  function flushPending(): void {
    if (!conn.ws || conn.ws.readyState !== WebSocket.OPEN) return
    while (pendingMessages.length > 0) {
      const msg = pendingMessages.shift()
      if (msg) sendMessage(conn.ws, msg)
    }
  }

  function safeSend(msg: ClientMessage): void {
    if (conn.ws && conn.ws.readyState === WebSocket.OPEN) {
      sendMessage(conn.ws, msg)
    } else {
      // Simpan pesan dalam antrian — akan dikirim saat koneksi berhasil
      pendingMessages.push(msg)
    }
  }

  // Mulai koneksi WebSocket saat provider dibuat.
  // flushPending() dipanggil dari dalam ws.onopen di createConnection
  // setelah re-join semua saluran selesai.
  createConnection(conn, wsBaseUrl, flushPending)

  return {
    channel(name: string, _options?: RealtimeChannelOptions): AppRealtimeChannel {
      // Kembalikan saluran yang sudah ada jika nama sama
      const existing = conn.channels.get(name)
      if (existing) return existing

      const ch = new VilChannel(name, safeSend)
      conn.channels.set(name, ch)
      return ch
    },

    async removeChannel(channel: AppRealtimeChannel): Promise<'ok' | 'timed out' | 'error'> {
      const ch = channel as VilChannel
      conn.channels.delete(ch.name)
      return ch.unsubscribe()
    },

    async removeAllChannels(): Promise<Array<'ok' | 'timed out' | 'error'>> {
      const results: Array<'ok' | 'timed out' | 'error'> = []
      for (const channel of conn.channels.values()) {
        results.push(await channel.unsubscribe())
      }
      conn.channels.clear()

      // Tutup koneksi WebSocket
      conn.destroyed = true
      if (conn.retryTimer) {
        clearTimeout(conn.retryTimer)
        conn.retryTimer = null
      }
      if (conn.pingInterval) {
        clearInterval(conn.pingInterval)
        conn.pingInterval = null
      }
      if (conn.ws) {
        conn.ws.close()
        conn.ws = null
      }

      return results
    },
  }
}
