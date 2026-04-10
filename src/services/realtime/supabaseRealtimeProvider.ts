import { type RealtimeChannel } from '@supabase/supabase-js'

import { getSupabaseClient } from '@/services/supabase/client'

import type { AppRealtimeChannel, RealtimeChannelOptions, RealtimeProvider } from './types'

export function createSupabaseRealtimeProvider(): RealtimeProvider {
  return {
    channel(name: string, options?: RealtimeChannelOptions): AppRealtimeChannel {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return getSupabaseClient().channel(name, options as any) as unknown as AppRealtimeChannel
    },

    removeChannel(channel: AppRealtimeChannel): Promise<'ok' | 'timed out' | 'error'> {
      return getSupabaseClient().removeChannel(channel as unknown as RealtimeChannel)
    },

    removeAllChannels(): Promise<Array<'ok' | 'timed out' | 'error'>> {
      return getSupabaseClient().removeAllChannels()
    },
  }
}
