import { createSupabaseApiClient } from './supabaseApiClient'
import type { ApiBackend, ApiClient } from './types'
import { createVilApiClient } from './vilApiClient'

let activeBackend: ApiBackend = 'supabase'
let activeClient: ApiClient | null = null

export function initApiClient(backend: ApiBackend = 'supabase'): ApiClient {
  activeBackend = backend
  activeClient = backend === 'vil' ? createVilApiClient() : createSupabaseApiClient()
  return activeClient
}

export function getApiClient(): ApiClient {
  if (!activeClient) {
    return initApiClient(activeBackend)
  }

  return activeClient
}

export function getApiBackend(): ApiBackend {
  return activeBackend
}
