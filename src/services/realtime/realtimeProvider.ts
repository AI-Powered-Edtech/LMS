import type { RealtimeProvider } from "./types";

let activeRealtimeProvider: RealtimeProvider | null = null;

export function setRealtimeProvider(provider: RealtimeProvider): void {
  activeRealtimeProvider = provider;
}

export function getRealtimeProvider(): RealtimeProvider {
  if (!activeRealtimeProvider) {
    throw new Error(
      "[RealtimeProvider] Not initialized. Call setRealtimeProvider() before using realtime features.",
    );
  }
  return activeRealtimeProvider;
}
