import { api as baseApi, apiFetch } from '@/src/lib/api'

export const api = {
  ...baseApi,
  from: (table: string) => apiFetch(`/${table}`),
  rpc: (fn: string, args?: Record<string, unknown>) =>
    apiFetch(`/rpc/${fn}`, {
      method: 'POST',
      body: JSON.stringify(args ?? {}),
    }),
}

export { apiFetch }

