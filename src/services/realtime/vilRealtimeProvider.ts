// NOT_IMPLEMENTED — VIL WebSocket support is Phase 4
// Stub exists so the provider factory import tree is intact.
// All channel methods are no-ops returning consistent shapes.

import type { AppRealtimeChannel, RealtimeChannelOptions, RealtimeProvider } from './types'

function createStubChannel(): AppRealtimeChannel {
  const ch: AppRealtimeChannel = {
    on: () => ch,
    subscribe: () => ch,
    unsubscribe: () => Promise.resolve('ok' as const),
    send: () => Promise.resolve('ok' as const),
    track: () => Promise.resolve('ok' as const),
    untrack: () => Promise.resolve('ok' as const),
    presenceState: () => ({}),
  }
  return ch
}

export function createVilRealtimeProvider(_baseUrl: string): RealtimeProvider {
  return {
    channel(_name: string, _options?: RealtimeChannelOptions): AppRealtimeChannel {
      return createStubChannel()
    },
    removeChannel(_channel: AppRealtimeChannel): Promise<'ok' | 'timed out' | 'error'> {
      return Promise.resolve('ok' as const)
    },
    removeAllChannels(): Promise<Array<'ok' | 'timed out' | 'error'>> {
      return Promise.resolve([])
    },
  }
}
