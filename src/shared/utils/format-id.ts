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
const dateFormatterDefault = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function formatDate(
  d: DateInput,
  opts?: Intl.DateTimeFormatOptions,
): string {
  const date = toValidDate(d);
  if (!date) return DATE_FALLBACK;
  if (opts) {
    return new Intl.DateTimeFormat(LOCALE, opts).format(date);
  }
  return dateFormatterDefault.format(date);
}

/**
 * Format date as "15/04/2026".
 */
const dateFormatterShort = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDateShort(d: DateInput): string {
  const date = toValidDate(d);
  if (!date) return DATE_FALLBACK;
  return dateFormatterShort.format(date);
}

/**
 * Format date-time as "15 Apr 2026, 14.05" (id-ID uses dot separator for time).
 */
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(d: DateInput): string {
  const date = toValidDate(d);
  if (!date) return DATE_FALLBACK;
  return dateTimeFormatter.format(date);
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
const numberFormatterDefault = new Intl.NumberFormat(LOCALE);

export function formatNumber(
  n: number | null | undefined,
  opts?: Intl.NumberFormatOptions,
): string {
  if (!isValidNumber(n)) return NUMBER_FALLBACK;
  if (opts) {
    return new Intl.NumberFormat(LOCALE, opts).format(n);
  }
  return numberFormatterDefault.format(n);
}

/**
 * Format currency, default IDR without decimals. e.g. "Rp 1.234.567".
 */
const currencyFormatterIDR = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(
  n: number | null | undefined,
  currency: string = "IDR",
): string {
  if (!isValidNumber(n)) return NUMBER_FALLBACK;
  let out;
  if (currency === "IDR") {
    out = currencyFormatterIDR.format(n);
  } else {
    out = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
    }).format(n);
  }
  // Intl output for IDR is "Rp1.234.567"; we normalize to "Rp 1.234.567".
  return out.replace(/^(Rp)(\S)/, "$1\u00a0$2");
}

/**
 * Format percent from already-percent number (82.5 -> "82,5%").
 */
const percentFormatter1Digit = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatPercent(
  n: number | null | undefined,
  digits: number = 1,
): string {
  if (!isValidNumber(n)) return NUMBER_FALLBACK;
  if (digits === 1) {
    return percentFormatter1Digit.format(n) + "%";
  }
  return (
    new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(n) + "%"
  );
}
