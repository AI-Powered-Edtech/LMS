// ─────────────────────────────────────────────────────────────────────────────
// Realtime abstraction types
// Consumers import from '@/services/realtime', NOT from '@db/db-js'
// ─────────────────────────────────────────────────────────────────────────────

export type RealtimeChannelStatus =
  | "SUBSCRIBED"
  | "TIMED_OUT"
  | "CLOSED"
  | "CHANNEL_ERROR";

export type PostgresChangeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface PostgresChangesFilter {
  event: PostgresChangeEvent;
  schema: string;
  table: string;
  filter?: string;
}

export interface PostgresChangesPayload<T = Record<string, unknown>> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: PostgresChangeEvent;
  new: T;
  old: T;
  errors: string[] | null;
}

export interface AppRealtimeChannel {
  on(
    type: "postgres_changes",
    filter: PostgresChangesFilter,
    callback: (payload: PostgresChangesPayload) => void,
  ): AppRealtimeChannel;
  on(
    type: "broadcast",
    filter: { event: string },
    callback: (payload: { payload: unknown }) => void,
  ): AppRealtimeChannel;
  on(
    type: "presence",
    filter: { event: "sync" | "join" | "leave" },
    callback: (payload?: unknown) => void,
  ): AppRealtimeChannel;
  subscribe(
    callback?: (status: RealtimeChannelStatus, err?: Error) => void,
  ): AppRealtimeChannel;
  unsubscribe(): Promise<"ok" | "timed out" | "error">;
  send(payload: {
    type: string;
    event: string;
    payload: unknown;
  }): Promise<"ok" | "timed out" | "error">;
  track(
    payload: Record<string, unknown>,
  ): Promise<"ok" | "timed out" | "error">;
  untrack(): Promise<"ok" | "timed out" | "error">;
  presenceState<T = Record<string, unknown>>(): Record<string, T[]>;
}

export interface RealtimeChannelOptions {
  config?: {
    broadcast?: { self?: boolean; ack?: boolean };
    presence?: { key?: string };
  };
}

export interface RealtimeProvider {
  channel(name: string, options?: RealtimeChannelOptions): AppRealtimeChannel;
  removeChannel(
    channel: AppRealtimeChannel,
  ): Promise<"ok" | "timed out" | "error">;
  removeAllChannels(): Promise<Array<"ok" | "timed out" | "error">>;
}
