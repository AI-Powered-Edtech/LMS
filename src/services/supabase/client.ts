import { createClient, SupabaseClient } from '@supabase/supabase-js'

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
    return (getSupabaseClient() as any)[k]
  },
})
