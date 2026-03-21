# EduSync LMS -- Dependency Security Audit

> **Date**: 2026-03-21
> **Tool**: `npm audit` (v10.x)
> **Auditor**: Automated Sprint 2.1 Day 4
> **Scope**: All production and development dependencies (535 packages total)

---

## Summary

| Severity  | Count |
| --------- | ----- |
| Critical  | 0     |
| High      | 0     |
| Moderate  | 0     |
| Low       | 0     |
| Info      | 0     |
| **Total** | **0** |

**Result: Clean -- no known vulnerabilities detected.**

---

## Audit Details

```
$ npm audit

found 0 vulnerabilities
```

### Breakdown by Dependency Type

| Type        | Package Count |
| ----------- | ------------- |
| Production  | 281           |
| Development | 161           |
| Optional    | 132           |
| Peer        | 11            |
| **Total**   | **535**       |

---

## Key Dependencies Reviewed

| Package                 | Version | Category         | Notes                                |
| ----------------------- | ------- | ---------------- | ------------------------------------ |
| `@supabase/supabase-js` | 2.98.0  | Auth/DB Client   | Core infrastructure -- latest stable |
| `react`                 | 19.2.4  | UI Framework     | React 19 -- latest major             |
| `react-router-dom`      | 7.13.1  | Routing          | v7 -- latest major                   |
| `@tanstack/react-query` | 5.90.21 | Server State     | v5 -- latest major                   |
| `vite`                  | 6.4.1   | Build Tool       | v6 -- latest major                   |
| `typescript`            | 5.8.3   | Language         | Latest stable                        |
| `tailwindcss`           | 4.2.1   | Styling          | v4 -- latest major                   |
| `vitest`                | 4.1.0   | Testing          | v4 -- latest major                   |
| `@playwright/test`      | 1.58.2  | E2E Testing      | Latest stable                        |
| `zustand`               | 5.0.12  | State Management | v5 -- latest major                   |
| `motion`                | 12.35.1 | Animation        | Latest stable                        |
| `katex`                 | 0.16.37 | Math Rendering   | Latest stable                        |
| `html2canvas`           | 1.4.1   | Screenshot/PDF   | Mature, stable                       |
| `jspdf`                 | 4.2.1   | PDF Generation   | Latest stable                        |

---

## Resolutions

No resolutions were required. All dependencies are at their latest stable versions with no known vulnerabilities.

---

## Accepted Risks

| Risk                                                       | Justification                                                                                                                      |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `html2canvas` v1.4.1 is mature but not actively maintained | Used only for certificate PDF generation (teacher-side). No user-supplied HTML is rendered. Sandboxed to a controlled DOM subtree. |
| `canvas-confetti` v1.9.4                                   | Purely visual -- no data processing. Used only for gamification celebrations.                                                      |

---

## Recommendations

1. **Dependabot**: A `.github/dependabot.yml` has been added (Sprint 2.1 Day 4) to automate weekly dependency update PRs.
2. **CI audit step**: Consider adding `npm audit --audit-level=high` to the CI pipeline to fail builds on high/critical vulnerabilities.
3. **Quarterly re-audit**: Schedule manual dependency review each quarter to assess transitive dependency health.
4. **Lock file hygiene**: The project uses `package-lock.json` (npm). Ensure `npm ci` is used in CI for reproducible builds.

---

## Next Audit

Scheduled: 2026-06-21 (quarterly) or triggered by Dependabot PR review.
