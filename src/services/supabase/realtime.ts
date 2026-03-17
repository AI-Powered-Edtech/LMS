import { supabase } from './client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Generic payload structure for realtime events
 */
export interface RealtimePayload<T = unknown> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | 'broadcast';
  table?: string;
  schema?: string;
  newRecord?: T;
  oldRecord?: T;
  payload?: {
    type: string;
    [key: string]: unknown;
  };
}

export const RealtimeService = {
  /**
   * Subscribe to a broadcast channel for real-time communication
   * @param channelName - Unique name for the channel
   * @param event - Event name to listen for
   * @param callback - Function to handle the payload
   * @returns RealtimeChannel instance for cleanup
   */
  subscribeToChannel<T = unknown>(
    channelName: string,
    event: string,
    callback: (payload: RealtimePayload<T>) => void
  ): RealtimeChannel {
    return supabase
      .channel(channelName)
      .on('broadcast', { event }, (payload) => {
        callback(payload.payload as RealtimePayload<T>);
      })
      .subscribe();
  },

  /**
   * Subscribe to database changes (INSERT, UPDATE, DELETE)
   * @param channelName - Unique name for the channel
   * @param table - Table name to listen to
   * @param schema - Schema name (default: 'public')
   * @param callback - Function to handle the payload
   * @returns RealtimeChannel instance for cleanup
   */
  subscribeToTable<T = Record<string, unknown>>(
    channelName: string,
    table: string,
    callback: (payload: RealtimePostgresChangesPayload<T>) => void,
    schema: string = 'public'
  ): RealtimeChannel {
    return supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema,
          table,
        },
        (payload) => callback(payload as RealtimePostgresChangesPayload<T>)
      )
      .subscribe();
  },

  /**
   * Unsubscribe from a realtime channel
   * @param channel - The channel to remove
   */
  unsubscribeFromChannel(channel: RealtimeChannel): void {
    supabase.removeChannel(channel);
  },

  /**
   * Get list of currently active channels
   */
  getActiveChannels(): RealtimeChannel[] {
    return supabase.getChannels();
  },
};
