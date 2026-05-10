import type { AuthProvider } from "./types";

let activeAuthProvider: AuthProvider | null = null;

export function setAuthProvider(provider: AuthProvider): void {
  activeAuthProvider = provider;
}

export function getAuthProvider(): AuthProvider {
  if (!activeAuthProvider) {
    throw new Error(
      "[AuthProvider] Not initialized. Call setAuthProvider() first.",
    );
  }
  return activeAuthProvider;
}
