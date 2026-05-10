/**
 * Indonesia locale format helpers.
 *
 * Central place for `id-ID` date/number formatting. All helpers handle
 * invalid input (null, undefined, NaN, invalid Date) without throwing,
 * returning a safe fallback string ("—" for dates, "" for numbers).
 *
 * Pure functions: locale is hard-coded to `'id-ID'` for now.
 */

const LOCALE = "id-ID";
const DATE_FALLBACK = "—";
const NUMBER_FALLBACK = "";

export type DateInput = Date | string | number | null | undefined;

function toValidDate(input: DateInput): Date | null {
  if (input === null || input === undefined || input === "") return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isValidNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * Format date as "15 April 2026" by default.
 */
export function formatDate(
  d: DateInput,
  opts: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "long",
    year: "numeric",
  },
): string {
  const date = toValidDate(d);
  if (!date) return DATE_FALLBACK;
  return new Intl.DateTimeFormat(LOCALE, opts).format(date);
}

/**
 * Format date as "15/04/2026".
 */
export function formatDateShort(d: DateInput): string {
  const date = toValidDate(d);
  if (!date) return DATE_FALLBACK;
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

/**
 * Format date-time as "15 Apr 2026, 14.05" (id-ID uses dot separator for time).
 */
export function formatDateTime(d: DateInput): string {
  const date = toValidDate(d);
  if (!date) return DATE_FALLBACK;
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const RTF = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

/**
 * Format relative time in Indonesian, e.g. "2 jam yang lalu", "kemarin".
 */
export function formatRelative(d: DateInput, now: Date = new Date()): string {
  const date = toValidDate(d);
  if (!date) return DATE_FALLBACK;

  const diffSec = Math.round((date.getTime() - now.getTime()) / 1000);
  const absSec = Math.abs(diffSec);

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];

  for (const [unit, secs] of units) {
    if (absSec >= secs || unit === "second") {
      const value = Math.round(diffSec / secs);
      return RTF.format(value, unit);
    }
  }
  return RTF.format(0, "second");
}

/**
 * Format number in id-ID locale (e.g. "1.234,56").
 */
export function formatNumber(
  n: number | null | undefined,
  opts?: Intl.NumberFormatOptions,
): string {
  if (!isValidNumber(n)) return NUMBER_FALLBACK;
  return new Intl.NumberFormat(LOCALE, opts).format(n);
}

/**
 * Format currency, default IDR without decimals. e.g. "Rp 1.234.567".
 */
export function formatCurrency(
  n: number | null | undefined,
  currency: string = "IDR",
): string {
  if (!isValidNumber(n)) return NUMBER_FALLBACK;
  const opts: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
  };
  if (currency === "IDR") {
    opts.minimumFractionDigits = 0;
    opts.maximumFractionDigits = 0;
  }
  // Intl output for IDR is "Rp1.234.567"; we normalize to "Rp 1.234.567".
  const out = new Intl.NumberFormat(LOCALE, opts).format(n);
  return out.replace(/^(Rp)(\S)/, "$1\u00a0$2");
}

/**
 * Format percent from already-percent number (82.5 -> "82,5%").
 */
export function formatPercent(
  n: number | null | undefined,
  digits: number = 1,
): string {
  if (!isValidNumber(n)) return NUMBER_FALLBACK;
  return (
    new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(n) + "%"
  );
}
