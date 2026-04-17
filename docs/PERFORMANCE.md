# EduSync LMS — Performance Guide

This guide covers performance budgets, how to measure them, and how to remediate regressions. Run Lighthouse on every release candidate and keep the Core Web Vitals within budget.

Related: [`deploy-checklist.md`](./deploy-checklist.md) (release flow).

---

## Performance Budget

These are the thresholds every production build must meet. Target the "Good" column; fail the release if the "Budget" column is exceeded.

| Metric | Good  | Budget (fail release if exceeded) | Notes |
|--------|-------|-----------------------------------|-------|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5s | Hero image / first heading on login, privacy, terms pages |
| FID (First Input Delay)        | < 100ms | 100ms | Input responsiveness (measured via INP on newer Lighthouse) |
| CLS (Cumulative Layout Shift)  | < 0.1 | 0.1  | No layout jumps during load |
| TTI (Time to Interactive)      | < 5s  | 5s   | App is fully interactive |
| Total JS (gzipped, main chunk) | < 500 kB | 500 kB | Enforced via `pnpm analyze` |

Soal Core Web Vitals, Google menggunakan LCP, INP (pengganti FID), dan CLS sebagai signal utama. Kita tetap track FID untuk kompatibilitas.

---

## How to Run

### Lighthouse CI (recommended)

Ensure the dev server is running on `http://localhost:5173`, then:

```bash
pnpm dev               # start dev server in one terminal
pnpm perf:lighthouse   # run Lighthouse CI in another
```

Or directly:

```bash
npx lhci autorun --config=lighthouserc.json
```

Config file: [`../lighthouserc.json`](../lighthouserc.json). Targets three auth-free routes:

- `/#/login`
- `/#/privacy`
- `/#/terms`

Results upload to `temporary-public-storage` — share the link in the PR.

### Ad-hoc single run

```bash
npx lighthouse http://localhost:5173 \
  --output=html \
  --output-path=./lighthouse-report.html \
  --chrome-flags='--headless'
```

### Bundle Analyzer

```bash
ANALYZE=true pnpm build
# open dist/stats.html in a browser
```

This surfaces which dependencies are bloating the bundle. Look for:

- Duplicate modules (e.g., multiple lodash versions)
- Unexpectedly large vendor chunks (PDF, video, chart libs)
- Entire icon libraries imported instead of tree-shaken

---

## Category Scores — What They Mean & How to Fix

### Performance (budget: warn below 0.8)

Measures load speed + runtime perf. Main levers:

- **LCP regression** → optimize the hero image (WebP/AVIF + `fetchpriority="high"`), preload critical fonts, reduce render-blocking CSS
- **TTI regression** → code-split heavy routes (`React.lazy`), defer non-critical JS, reduce main-thread work
- **FCP regression** → inline critical CSS, reduce server response time (SSR / edge cache)

### Accessibility (budget: error below 0.9 — hard fail)

A11y is required for Play Store compliance. Common issues:

- Missing `alt` on images → add descriptive alt text
- Low color contrast → check against WCAG AA (4.5:1 for normal text)
- Missing form labels → associate `<label>` with `<input>` via `htmlFor`
- Missing lang attribute on `<html>` → set to `id` or `en`
- Interactive elements not keyboard-accessible → ensure `button`/`a` instead of clickable `div`

### Best Practices (budget: warn below 0.9)

Security + modern web hygiene:

- HTTPS everywhere (Vercel enforces by default)
- No deprecated APIs (check console warnings)
- No browser errors during load
- Proper CSP headers (see [`security/`](./security/))

### SEO (budget: warn below 0.9)

Even for an auth-gated app, public pages (login, privacy, terms) must be crawlable:

- `<title>` and `<meta name="description">` on every public route
- `robots.txt` allows indexing of public pages
- Responsive viewport meta tag
- Links have discernible text

### PWA (budget: warn below 0.9)

Required for Play Store TWA:

- `manifest.webmanifest` with `name`, `short_name`, `icons`, `start_url`, `display: standalone`
- Service worker registered and handles offline
- Icons at 192x192 and 512x512 (maskable)
- `theme_color` + `background_color` set

---

## Remediation Workflow

When Lighthouse flags a regression:

1. **Identify the culprit** — open the Lighthouse HTML report, drill into the failing audit
2. **Profile locally** — Chrome DevTools Performance panel for runtime issues, Network panel for load issues
3. **Check the bundle** — run `ANALYZE=true pnpm build` to see if a new dep is the cause
4. **Fix** — apply the remediation tip above
5. **Re-run Lighthouse** — verify the score improves
6. **Document** — if a third-party dep is the cause and can't be replaced, note it in `docs/dependency-decisions.md`

---

## When to Run

- **Every PR** (future — CI integration pending): on changes to `src/**`, `index.html`, `vite.config.ts`, `package.json`
- **Before each release**: run locally as part of the [deploy checklist](./deploy-checklist.md)
- **Weekly**: schedule a manual run on the production URL to track drift
- **After adding a dependency**: always re-run the bundle analyzer

---

## Troubleshooting

- **`ECONNREFUSED 127.0.0.1:5173`** → dev server not running; start `pnpm dev` first
- **Chrome fails to launch** → on CI, ensure `--no-sandbox` is in `chromeFlags` (already set)
- **Scores wildly different run-to-run** → increase `numberOfRuns` in `lighthouserc.json` and use median
- **PWA score 0** → make sure the build is served with a manifest + service worker; dev server doesn't include SW
