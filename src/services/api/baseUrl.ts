export function normalizeBaseUrl(input: string): string {
  return input.replace(/\/+$/, "");
}

export function getVilHttpBaseUrl(): string {
  const raw = normalizeBaseUrl(import.meta.env.VITE_API_URL ?? "");

  if (!import.meta.env.DEV) return raw;
  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return "";
  } catch {
    return "";
  }

  return raw;
}
