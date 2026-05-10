const POST_AUTH_REDIRECT_KEY = "edusync_post_auth_redirect";
const OAUTH_REDIRECT_PENDING_KEY = "edusync_oauth_redirect_pending";

export const AUTH_SURFACE_PREFIXES = [
  "/login",
  "/auth/callback",
  "/auth/error",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/workspace-selector",
];

export interface RedirectTargetInput {
  pathname: string;
  search?: string;
  hash?: string;
}

export function isAuthSurfacePath(pathname: string): boolean {
  const normalizedPath = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  return AUTH_SURFACE_PREFIXES.some(
    (prefix) =>
      normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
  );
}

export function sanitizeRedirectTarget(
  target: string | null | undefined,
): string | null {
  if (!target) return null;

  try {
    const url = new URL(target, window.location.origin);
    if (url.origin !== window.location.origin) return null;

    const normalized = `${url.pathname}${url.search}${url.hash}`;
    if (!normalized.startsWith("/")) return null;
    if (
      normalized.startsWith("/auth/callback") ||
      normalized.startsWith("/auth/error")
    ) {
      return null;
    }

    return normalized;
  } catch {
    if (!target.startsWith("/")) return null;
    if (target.startsWith("/auth/callback") || target.startsWith("/auth/error"))
      return null;
    return target;
  }
}

export function buildRedirectTarget(input: RedirectTargetInput): string {
  return `${input.pathname}${input.search ?? ""}${input.hash ?? ""}`;
}

export function persistPostAuthRedirect(
  input: RedirectTargetInput | string | null | undefined,
): void {
  const target =
    typeof input === "string"
      ? sanitizeRedirectTarget(input)
      : sanitizeRedirectTarget(input ? buildRedirectTarget(input) : null);

  if (!target) return;
  sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, target);
}

export function peekPostAuthRedirect(): string | null {
  return sanitizeRedirectTarget(sessionStorage.getItem(POST_AUTH_REDIRECT_KEY));
}

export function consumePostAuthRedirect(): string | null {
  const target = peekPostAuthRedirect();
  sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  return target;
}

export function clearPostAuthRedirect(): void {
  sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
}

export function markOAuthRedirectPending(): void {
  sessionStorage.setItem(OAUTH_REDIRECT_PENDING_KEY, "1");
}

export function clearOAuthRedirectPending(): void {
  sessionStorage.removeItem(OAUTH_REDIRECT_PENDING_KEY);
}

export function isOAuthRedirectPending(): boolean {
  return sessionStorage.getItem(OAUTH_REDIRECT_PENDING_KEY) === "1";
}

export function normalizeLegacyHashUrl(
  url: Pick<Location, "hash">,
): string | null {
  const hash = url.hash ?? "";
  if (!hash.startsWith("#/")) return null;

  const rewritten = hash.slice(1);
  return rewritten.startsWith("/") ? rewritten : `/${rewritten}`;
}
