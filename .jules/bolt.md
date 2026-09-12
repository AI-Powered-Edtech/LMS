## $(date +%Y-%m-%d) - Expensive Intl API Instantiation
**Learning:** Instantiating `Intl.NumberFormat`, `Intl.DateTimeFormat`, and `Intl.RelativeTimeFormat` inside hot paths or render loops (e.g. inside components or formatting functions like `formatNumber`) is surprisingly slow and can bottleneck performance. They should always be cached and reused.
**Action:** Always use a module-level cache for `Intl.*` formatters (e.g. keyed by locale + options stringified) instead of instantiating them on every call.
