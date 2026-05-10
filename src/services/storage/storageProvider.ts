import type { StorageProvider } from "./types";

let activeStorageProvider: StorageProvider | null = null;

export function setStorageProvider(provider: StorageProvider): void {
  activeStorageProvider = provider;
}

export function getStorageProvider(): StorageProvider {
  if (!activeStorageProvider) {
    throw new Error(
      "[StorageProvider] Not initialized. Call setStorageProvider() before using storage features.",
    );
  }
  return activeStorageProvider;
}
