import type { ApiBackend, ApiClient } from './types'

let activeBackend: ApiBackend = 'vil'
let activeClient: ApiClient | null = null

export function setActiveApiBackend(backend: ApiBackend): void {
  activeBackend = backend
}

export function getActiveApiBackend(): ApiBackend {
  return activeBackend
}

export function setActiveApiClient(client: ApiClient | null): void {
  activeClient = client
}

export function getActiveApiClient(): ApiClient | null {
  return activeClient
}
