# Implementation Plan — Verified Audit Findings

> Based on verified accurate findings from `notion-report-2026-04-01T16-30-54.md`
> Only includes findings confirmed against actual codebase

---

## Priority Matrix

| Priority      | Issue                                       | Effort    | Impact | WCAG |
| ------------- | ------------------------------------------- | --------- | ------ | ---- |
| P0 — Critical | Video captions (WCAG 1.2.2 Level A)         | Medium    | High   | ✅   |
| P1 — High     | Focus trap in InteractiveVideoEditor        | Low       | Medium | ✅   |
| P1 — High     | Password policy strengthen (NIST)           | Low       | Medium | —    |
| P2 — Medium   | Bundle size monitoring (bundlesize package) | Low       | Medium | —    |
| P2 — Medium   | Dark mode flash prevention (FOLT)           | Low       | Low    | —    |
| P3 — Low      | Empty catch blocks cleanup                  | Low       | Low    | —    |
| P4 — Future   | i18n framework migration                    | Very High | High   | —    |

---

## P0: Video Captions Support (WCAG 1.2.2 Level A)

### Problem

- `src/components/LessonViewer/blocks/VideoBlock.tsx` — `<video>` element tanpa `<track>` elements
- `src/components/LessonViewer/VideoViewer.tsx` — `<video>` element tanpa `<track>` elements
- Transcript panel di VideoViewer sudah ada (custom JSON `{time, text}`), tapi bukan WebVTT captions
- InteractiveVideoEditor tidak punya UI untuk upload/manage caption files

### Solution

#### Phase 1: Database Schema

```sql
-- Add caption tracks table
CREATE TABLE lesson_video_captions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  lesson_id UUID NOT NULL REFERENCES lessons(id),
  block_id UUID,                    -- optional, per-block caption
  language_code VARCHAR(5) NOT NULL DEFAULT 'id',
  label TEXT NOT NULL,              -- e.g. "Bahasa Indonesia", "English"
  vtt_url TEXT NOT NULL,            -- Supabase Storage URL
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE lesson_video_captions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their video captions"
  ON lesson_video_captions FOR SELECT
  USING (tenant_id = auth.jwt()->>'tenant_id');

CREATE POLICY "Teachers can manage their video captions"
  ON lesson_video_captions FOR ALL
  USING (tenant_id = auth.jwt()->>'tenant_id');
```

#### Phase 2: VideoBlock.tsx — Add `<track>` Support

- Add `captionTracks` prop: `{ language: string, label: string, src: string, isDefault: boolean }[]`
- Render `<track>` elements inside `<video>` for direct video URLs
- Add caption toggle button in video controls
- For YouTube/Vimeo: pass `cc_load_policy=1` (YouTube) or `texttrack` (Vimeo) URL params

#### Phase 3: VideoViewer.tsx — Add `<track>` Support

- Same pattern as VideoBlock
- Integrate with existing transcript panel — add toggle between "Transcript" and "Captions" modes
- Caption mode shows on-video WebVTT captions
- Transcript mode shows existing sidebar transcript panel

#### Phase 4: InteractiveVideoEditor.tsx — Caption Upload UI

- Add tab/section for "Teks & Captions" alongside existing "Event Interaktif"
- Upload WebVTT file to Supabase Storage
- Preview caption timing
- Set default language
- Save caption metadata to `lesson_video_captions` table

#### Phase 5: Service Layer

- New service: `src/features/courses/services/videoCaptionService.ts`
  - `uploadCaption(tenantId, lessonId, blockId, languageCode, label, file)` → uploads VTT, returns URL
  - `getCaptions(lessonId, blockId?)` → fetches caption tracks
  - `deleteCaption(captionId)` → deletes from storage + DB
  - `setDefaultCaption(captionId)` → updates is_default flag

#### Files Modified

- `src/components/LessonViewer/blocks/VideoBlock.tsx`
- `src/components/LessonViewer/VideoViewer.tsx`
- `src/features/courses/components/InteractiveVideoEditor.tsx`
- New: `src/features/courses/services/videoCaptionService.ts`
- New: SQL migration for `lesson_video_captions` table

#### Acceptance Criteria

- [ ] WebVTT captions render on direct video playback
- [ ] Caption toggle button visible in video controls
- [ ] Teachers can upload VTT files via InteractiveVideoEditor
- [ ] Multiple language tracks supported
- [ ] Default caption track auto-enabled
- [ ] YouTube/Vimeo caption passthrough (if platform supports)
- [ ] RLS policies enforce tenant isolation

---

## P1: Focus Trap in InteractiveVideoEditor

### Problem

- `src/features/courses/components/InteractiveVideoEditor.tsx` renders its own `fixed inset-0 z-50` overlay
- Does NOT use shared `Modal.tsx` component
- No focus trap implementation — keyboard users can Tab out of modal
- `Modal.tsx` already has robust focus trap (Tab cycling, Escape key, focus boundary, initial focus)

### Solution

#### Option A (Recommended): Refactor to Use Modal.tsx

- Replace custom overlay with `<Modal isOpen={isOpen} onClose={onClose} title="Edit Video Interaktif">`
- Use compound components: `<ModalHeader>`, `<ModalBody>`, `<ModalFooter>`
- Inherits all focus trap, ARIA, and accessibility features from Modal.tsx

#### Option B: Add Focus Trap to Current Overlay

- Add `useEffect` with Tab/Shift+Tab cycling logic (copy pattern from Modal.tsx lines 39-55)
- Add `focusin` event listener for focus boundary (Modal.tsx lines 74-79)
- Add initial focus on first focusable element (Modal.tsx lines 68-71)
- Add Escape key handler

#### Recommendation

**Option A** — Consistent UX, less code duplication, inherits future Modal improvements automatically.

### Files Modified

- `src/features/courses/components/InteractiveVideoEditor.tsx`

### Acceptance Criteria

- [ ] Tab key cycles only within modal content
- [ ] Shift+Tab cycles backwards
- [ ] Escape key closes modal
- [ ] Focus returns to trigger element on close
- [ ] `aria-modal="true"` and `role="dialog"` present
- [ ] Body scroll locked when modal open

---

## P1: Password Policy Strengthen (NIST Guidelines)

### Problem

- `src/features/profile/components/PasswordChangeForm.tsx` — minimum 8 characters
- NIST SP 800-63B recommends minimum 8, but modern best practice is 12+
- Strength meter: score 0-1 = weak, 2 = medium, 3-4 = strong
- Validation requires at least 2 of (uppercase, number, special)

### Solution

#### Change Password Policy

```typescript
// BEFORE (line 14):
if (password.length < 8) return 'weak'

// AFTER:
if (password.length < 12) return 'weak'
if (password.length < 16) {
  // 12-15 chars: need 3 of 4 criteria
  if (score < 3) return 'weak'
  return 'medium'
}
// 16+ chars: score 2+ = medium, 3+ = strong
```

#### Updated Strength Criteria

| Length | Criteria | Strength |
| ------ | -------- | -------- |
| < 12   | Any      | Weak     |
| 12-15  | 2 of 4   | Medium   |
| 12-15  | 3-4 of 4 | Strong   |
| 16+    | 2 of 4   | Medium   |
| 16+    | 3-4 of 4 | Strong   |

#### UI Updates

- Update strength bar labels to reflect new thresholds
- Add helper text: "Minimal 12 karakter untuk keamanan optimal"
- Update validation error messages

### Files Modified

- `src/features/profile/components/PasswordChangeForm.tsx`

### Acceptance Criteria

- [ ] Passwords under 12 chars always show "weak"
- [ ] 12-15 char passwords need 3 criteria for "strong"
- [ ] 16+ char passwords can achieve "strong" with 3 criteria
- [ ] UI labels updated with new thresholds
- [ ] Validation error messages updated
- [ ] Existing passwords not forced to change (grandfathered)

---

## P2: Bundle Size Monitoring

### Problem

- `bundlesize.config.json` exists with 3 budget rules
- `bundlesize` npm script exists: `"bundlesize": "bundlesize"`
- `bundlesize` package is NOT in `devDependencies`
- `rollup-plugin-visualizer` IS installed and working via `analyze` script

### Solution

#### Step 1: Add bundlesize Package

```bash
pnpm add -D bundlesize2
```

Note: `bundlesize` original package is unmaintained. Use `bundlesize2` as drop-in replacement.

#### Step 2: Update package.json Script

```json
"bundlesize": "bundlesize2"
```

#### Step 3: Verify Config

Current `bundlesize.config.json` is valid:

```json
{
  "files": [
    { "path": "./dist/assets/index-*.js", "maxSize": "200 kB" },
    { "path": "./dist/assets/vendor-*.js", "maxSize": "500 kB" },
    { "path": "./dist/assets/*.css", "maxSize": "60 kB" }
  ]
}
```

#### Step 4: Add CI Step (Optional)

Add to `.github/workflows/feature-health.yml` or create new workflow:

```yaml
- name: Check bundle sizes
  run: pnpm run build && pnpm run bundlesize
```

### Files Modified

- `package.json` — add `bundlesize2` devDependency, update script

### Acceptance Criteria

- [ ] `pnpm run bundlesize` executes successfully
- [ ] Budget thresholds enforced
- [ ] CI step added (optional)
- [ ] Build fails if bundles exceed budget

---

## P2: Dark Mode Flash Prevention (FOLT)

### Problem

- Potential Flash of Light Theme (FOLT) on page load
- If `ThemeProvider` reads from `localStorage` on mount, first render uses default theme
- JavaScript hydrates → reads localStorage → switches theme → visible flash

### Solution

#### Step 1: Check Current ThemeProvider Implementation

Read `src/contexts/ThemeContext.tsx` to determine:

- Does it use lazy initialization: `useState(() => getInitialTheme())`?
- Or does it read in `useEffect` (causes flash)?

#### Step 2A: If Flash Exists — Add Inline Script

Add to `index.html` before React bundle:

```html
<script>
  ;(function () {
    try {
      var theme = localStorage.getItem('theme')
      if (
        theme === 'dark' ||
        (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ) {
        document.documentElement.classList.add('dark')
      }
    } catch (e) {}
  })()
</script>
```

#### Step 2B: Alternative — Lazy State Initialization

If ThemeContext uses `useEffect`, change to:

```typescript
const [theme, setTheme] = useState(() => {
  if (typeof window === 'undefined') return 'light'
  return localStorage.getItem('theme') || 'light'
})
```

### Files Potentially Modified

- `index.html` — add inline theme script
- `src/contexts/ThemeContext.tsx` — lazy state initialization

### Acceptance Criteria

- [ ] No visible flash on page load for dark mode users
- [ ] Theme persists across page navigations
- [ ] System preference (`prefers-color-scheme`) respected on first visit
- [ ] Tested with slow 3G network simulation

---

## P3: Empty Catch Blocks Cleanup

### Problem

- 2 empty catch blocks found in `scripts/score-features.js` (lines 97, 118)
- No empty catch blocks in `src/` production code
- Non-production issue, but good hygiene

### Solution

#### Add Logging to Empty Catches

```javascript
// BEFORE:
catch {}

// AFTER:
catch (err) {
  console.error(`[score-features] Error processing: ${err.message}`)
}
```

### Files Modified

- `scripts/score-features.js`

### Acceptance Criteria

- [ ] No empty catch blocks anywhere in codebase
- [ ] Errors logged with context

---

## P4: i18n Framework Migration (Future)

### Problem

- 778 hardcoded Bahasa Indonesia strings across `.tsx` files
- No i18n framework (`react-i18next`, `i18next` not installed)
- No `locales/` or translation files
- Will block international expansion

### Solution (High-Level — Detailed Plan Required Separately)

#### Phase 1: Infrastructure

- Install `i18next`, `react-i18next`, `i18next-browser-languagedetector`
- Create `src/i18n/` directory with config
- Create `src/locales/id/translation.json` (extract all 778 strings)
- Create `src/locales/en/translation.json` (English translations)

#### Phase 2: Extraction

- Replace all hardcoded strings with `t('key')` calls
- Use `i18next-parser` to automate extraction
- Manual review for context-dependent strings

#### Phase 3: Language Toggle

- Add language selector in settings/profile
- Persist preference in localStorage + user profile
- Default to Bahasa Indonesia

#### Phase 4: Testing

- E2E tests for language switching
- Verify all strings translated in both languages

### Estimated Effort

- 3-4 weeks for full migration
- 778 strings to extract and translate
- All `.tsx` files touched

### Files Modified

- New: `src/i18n/` configuration
- New: `src/locales/id/`, `src/locales/en/`
- All `.tsx` files with hardcoded Indonesian text

---

## Implementation Order & Dependencies

```
Week 1-2:
├── P0: Video Captions (Database + VideoBlock + VideoViewer)
├── P1: Focus Trap (InteractiveVideoEditor)
└── P2: Bundle Size Monitoring

Week 3:
├── P0: Video Captions (InteractiveVideoEditor upload UI)
├── P1: Password Policy
└── P2: Dark Mode Flash Prevention

Week 4:
├── P0: Video Captions (Testing + E2E)
├── P3: Empty Catch Blocks
└── P4: i18n Planning & Architecture Design

Week 5-8:
└── P4: i18n Migration (full implementation)
```

---

## Risk Assessment

| Issue           | Risk                                         | Mitigation                                               |
| --------------- | -------------------------------------------- | -------------------------------------------------------- |
| Video Captions  | YouTube/Vimeo caption support complex        | Start with direct video URLs, add platform support later |
| Focus Trap      | InteractiveVideoEditor has complex state     | Option A (Modal.tsx) minimizes risk                      |
| Password Policy | Existing users with 8-11 char passwords      | Grandfather existing passwords, enforce on change        |
| Bundle Size     | Budgets may be too tight for current bundles | Run `analyze` first to measure current sizes             |
| Dark Mode Flash | May not be an issue if already lazy-init     | Verify before implementing                               |
| i18n            | Massive scope, high risk of regression       | Phase approach, feature flag toggle                      |

---

## Testing Strategy

### Video Captions

- Unit: `<track>` element rendering with various props
- E2E: Upload VTT → Play video → Verify captions display
- E2E: Toggle captions on/off
- E2E: Multiple language tracks
- Accessibility: Screen reader announces caption availability

### Focus Trap

- Manual: Tab through InteractiveVideoEditor, verify focus stays within
- E2E: Playwright keyboard-only test
- Accessibility: axe-core scan on modal

### Password Policy

- Unit: `getPasswordStrength()` with various inputs
- Unit: `validate()` with edge cases
- E2E: Password change flow with weak/medium/strong passwords

### Bundle Size

- CI: `pnpm run bundlesize` as gate
- Manual: `pnpm run analyze` for visual inspection

### Dark Mode

- Manual: Slow 3G simulation, verify no flash
- E2E: Screenshot comparison on first paint

---

## Documentation Updates Required

After implementation:

- `DATABASE_ARCHITECTURE.md` — add `lesson_video_captions` table
- `DOMAIN_MAP.md` — add video caption domain
- `USERFLOW.md` — update video playback flow with caption steps
- `ENGINEERING_ROADMAP.md` — mark completed items
