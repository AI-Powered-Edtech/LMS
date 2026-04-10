# Global Rules for All Migration Agents

**Audience:** Any agent executing migration tasks  
**Version:** 1.0  
**Last Updated:** 2026-04-09

---

## Package Manager

**ALWAYS use `pnpm`** — never `npm` or `yarn`

```bash
# Correct
pnpm install
pnpm dev
pnpm build
pnpm typecheck
pnpm lint

# Wrong
npm install
yarn install
```

---

## Language: Bahasa Indonesia

All user-visible text must be in Bahasa Indonesia:

- Labels, buttons, headers
- Error messages
- Toast notifications
- Validation messages
- Empty states
- Loading states

**Exception:** English is acceptable for:

- Code comments (when needed)
- Technical documentation
- Console logs (debug only)

---

## Dark Mode: Tailwind Variants

All new components MUST include `dark:` Tailwind variants:

```tsx
// Correct
<div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
  <button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
    Teks
  </button>
</div>

// Wrong — missing dark: variants
<div className="bg-white text-gray-900">
  <button className="bg-blue-600 hover:bg-blue-700">
    Teks
  </button>
</div>
```

Test dark mode by adding `class="dark"` to the HTML element.

---

## Code Style

### No Comments Unless Requested

Do NOT add explanatory comments to code unless explicitly requested by the user.

### Naming Conventions

- Components: PascalCase (`CourseCard.tsx`)
- Hooks: camelCase with `use` prefix (`useCourse.ts`)
- Services: camelCase (`courseService.ts`)
- Types: PascalCase (`CourseResponse.ts`)
- Constants: SCREAMING_SNAKE_CASE

### Imports

- Use path aliases (`@/components/...`)
- Sort imports: external → internal → relative
- No barrel re-exports that hide implementation

---

## Git Branch Strategy

### Branch Naming

```
{type}/{phase}-{description}
```

Types:

- `phase-0/...` — Phase 0 work
- `phase-1/...` — Phase 1 work
- `feature/...` — New features
- `fix/...` — Bug fixes
- `docs/...` — Documentation

Examples:

```
phase-0/api-abstraction
phase-1/auth-scaffold
feature/new-reporting
fix/quiz-timeout
docs/phase-2-guide
```

### Commit Messages

```
{type}: {short description}

{optional body}
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Example:

```
feat: add API client abstraction layer

- Create ApiClient interface
- Implement SupabaseApiClient
- Add VIL stub implementation
```

### PR Requirements

- All PRs must pass CI
- At least one review required
- Squash commits before merge
- Update CHANGELOG.md

---

## Rollback Rules

### Phase 0 Rollback

- Set `VITE_API_BACKEND=supabase` in `.env`
- Instant, no data impact

### Phase 1 Rollback (Auth)

- Configure Nginx to route `/auth/*` to Supabase
- Time: <1 minute
- No data impact

### Phase 2 Rollback (CRUD)

- Use per-flow feature flags
- Time: <1 minute
- No data impact

### Phase 6 Rollback

**NO ROLLBACK POSSIBLE**

- Commits and migrations are destructive
- Ensure full E2E + load test passes before proceeding

---

## Verification Commands

### TypeScript Check

```bash
pnpm typecheck
```

### Lint Check

```bash
pnpm lint
```

### Unit Tests

```bash
pnpm test
```

### E2E Tests

```bash
pnpm test:e2e
```

### CI Mode Tests

```bash
pnpm test:ci
```

### Build

```bash
pnpm build
```

### Full Verification (before PR)

```bash
pnpm typecheck && pnpm lint && pnpm test:ci && pnpm build
```

---

## Supabase Import Rules

### Phase 0+ (After Abstraction)

Zero Supabase imports allowed in:

- `src/features/`
- `src/contexts/`
- `src/utils/`
- `src/components/`

Only allowed in:

- `src/services/api/supabaseApiClient.ts`
- Test files (`__tests__/`)

### Verification

```bash
grep -r "from '@supabase/supabase-js'" src/features/ src/contexts/ src/utils/ src/components/ | grep -v __tests__ | wc -l
# Expected: 0

grep -r "from '@/services/supabase/client'" src/features/ src/contexts/ src/utils/ src/components/ | grep -v __tests__ | wc -l
# Expected: 0
```

---

## Tenant Isolation

ALL database queries MUST respect tenant isolation:

- Always include `tenant_id` filter
- Use `get_my_tenant_id()` function
- Never expose tenant_id in URLs or logs

```sql
-- Correct
WHERE tenant_id = (SELECT get_my_tenant_id())

-- Wrong
WHERE tenant_id = $1  -- unless $1 is verified as user's tenant
```

---

## Error Handling

### PostgREST Error Format

All API errors must match PostgREST format:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable message",
  "details": {},
  "hint": "Suggestion"
}
```

### Supabase Auth Errors

Translate GoTrue errors to Bahasa Indonesia:

```tsx
import { translateAuthError } from '@/features/auth/utils'
// See Login.tsx for examples
```

---

## React Query Patterns

- Use query key factories
- Match existing invalidation patterns
- Test optimistic updates
- Handle errors gracefully with toasts

---

## File Organization

Follow feature module structure:

```
src/features/{domain}/
├── api/           # API client functions
├── queries/       # React Query hooks
├── hooks/         # Custom React hooks
├── store/         # Zustand stores
├── types/         # TypeScript types
├── components/    # React components
└── utils/         # Utility functions
```

---

## Checklist Before Creating PR

- [ ] All `pnpm typecheck` passes
- [ ] All `pnpm lint` passes
- [ ] All tests pass (`pnpm test:ci`)
- [ ] Build succeeds (`pnpm build`)
- [ ] No Supabase imports in features/
- [ ] All new components have `dark:` variants
- [ ] All UI text in Bahasa Indonesia
- [ ] CHANGELOG.md updated
- [ ] Component Registry updated (if applicable)
- [ ] Relevant documentation updated

---

## Codebase Facts Reference (verified 2026-04-10)

Agents should reference these counts instead of guessing or re-scanning.

### Edge Functions: 30

All 30 functions in `supabase/functions/`:

`ai-grade-essay`, `ai-tutor`, `bulk-import-users`, `check-plagiarism`, `check-rate-limit`, `generate-ai-content`, `generate-course-outline`, `generate-executive-report`, `generate-lesson-draft`, `generate-parent-report`, `generate-pdf`, `generate-quiz-from-content`, `grade-quiz-attempt`, `health-check`, `load-quiz-data`, `lti-grade-passback`, `lti-jwks`, `lti-launch`, `lti-oidc-login`, `process-progress-events`, `progress-events`, `recommend-learning-path`, `scorm-extract`, `send-email-digest`, `send-parent-digest`, `send-parent-otp`, `send-push`, `transform-course-content`, `video-webhook`, `whatsapp-webhook`

### Supabase Import Count: 129

| Location | Count |
| --- | --- |
| `src/features/` | 120 |
| `src/contexts/` | 1 |
| `src/utils/` | 7 |
| `src/components/` | 2 |
| **Total** | **129** |

### Verification Commands

```bash
# Count Edge Functions (exclude _shared)
ls -d supabase/functions/*/ | grep -v _shared | wc -l
# Expected: 30

# Count Supabase imports in features
grep -rl "supabase" src/features/ | wc -l
# Expected: ~120
```

### Key Paths

- `src/services/api/` does NOT exist yet (Phase 0A creates it)
- Hash routing `/#/` is active (HashRouter)
- Phase -1 outputs: `docs/migration/` (4 files)
- Revised Phase 0 plan: `plans/REVISED_PHASE_0.md`
