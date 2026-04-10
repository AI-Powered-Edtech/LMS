import { createClient, SupabaseClient } from '@supabase/supabase-js'

import { getActiveApiBackend, getActiveApiClient } from '@/services/api/runtime'
import { getAuthProvider } from '@/services/auth'
import { getStorageProvider } from '@/services/storage'

let supabaseClient: SupabaseClient | null = null
let initialized = false

export function initializeSupabaseClient(): void {
  if (initialized) return

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  })
  initialized = true
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    initializeSupabaseClient()
  }
  return supabaseClient!
}

export function setSupabaseClient(client: SupabaseClient): void {
  supabaseClient = client
  initialized = true
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, k) {
    const nativeClient = getSupabaseClient()
    const activeClient = getActiveApiClient()

    if (getActiveApiBackend() !== 'vil') {
      return Reflect.get(nativeClient, k)
    }

    if (k === 'from') {
      return (table: string) => (activeClient ?? nativeClient).from(table)
    }

    if (k === 'rpc') {
      return (fn: string, args?: Record<string, unknown>) => (activeClient ?? nativeClient).rpc(fn, args)
    }

    if (k === 'auth') {
      return getAuthProvider() as unknown
    }

    if (k === 'storage') {
      return getStorageProvider() as unknown
    }

    if (k === 'functions') {
      return Reflect.get(nativeClient, 'functions')
    }

    return Reflect.get(nativeClient, k)
  },
})
