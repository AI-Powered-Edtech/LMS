import {
  getActiveApiBackend,
  getActiveApiClient,
  setActiveApiBackend,
  setActiveApiClient,
} from './runtime'
import { createSupabaseApiClient } from './supabaseApiClient'
import type { ApiBackend, ApiClient } from './types'
import { createVilApiClient } from './vilApiClient'

export function initApiClient(backend: ApiBackend = 'supabase'): ApiClient {
  setActiveApiBackend(backend)
  const client = backend === 'vil' ? createVilApiClient() : createSupabaseApiClient()
  setActiveApiClient(client)
  return client
}

export function getApiClient(): ApiClient {
  const client = getActiveApiClient()
  if (!client) {
    return initApiClient(getActiveApiBackend())
  }

  return client
}

export function getApiBackend(): ApiBackend {
  return getActiveApiBackend()
}
