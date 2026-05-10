import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const LANGUAGE_TO_LOCALE: Record<string, string> = {
  id: "id-ID",
  en: "en-US",
};

export function useLocaleFormatters() {
  const { i18n } = useTranslation();
  const locale =
    LANGUAGE_TO_LOCALE[i18n.resolvedLanguage || i18n.language] ?? "id-ID";

  return useMemo(() => {
    const formatDate = (
      value: string | number | Date,
      options?: Intl.DateTimeFormatOptions,
    ) => new Date(value).toLocaleDateString(locale, options);

    const formatDateTime = (
      value: string | number | Date,
      options?: Intl.DateTimeFormatOptions,
    ) => new Date(value).toLocaleString(locale, options);

    const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, options).format(value);

    const formatCurrency = (
      value: number,
      currency = "IDR",
      options?: Intl.NumberFormatOptions,
    ) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
        ...options,
      }).format(value);

    const formatPercent = (value: number, options?: Intl.NumberFormatOptions) =>
      `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1, ...options }).format(value)}%`;

    const formatRelativeTime = (dateLike: string | number | Date) => {
      const date = new Date(dateLike);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1)
        return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
          0,
          "minute",
        );
      if (diffMins < 60)
        return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
          -diffMins,
          "minute",
        );
      if (diffHours < 24)
        return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
          -diffHours,
          "hour",
        );
      return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
        -diffDays,
        "day",
      );
    };

    return {
      locale,
      formatDate,
      formatDateTime,
      formatNumber,
      formatCurrency,
      formatPercent,
      formatRelativeTime,
    };
  }, [locale]);
}
