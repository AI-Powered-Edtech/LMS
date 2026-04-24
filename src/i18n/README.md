# i18n (react-i18next)

Default language: `id` (Indonesian). Fallback: `id`. `en` is available for
international schools but is NOT the primary locale.

## Usage in components

```tsx
import { useT } from '@/shared/hooks/useT'

function SaveButton() {
  const { t } = useT()
  return <button>{t('common.save')}</button>
}
```

## Adding a new key

1. Add it to `src/i18n/locales/id.json` first (source of truth, always complete).
2. Mirror the same key path in `src/i18n/locales/en.json` with the English value.
3. Reference it by dotted path: `t('namespace.key_name')`.

## Rules

- Keys: `snake_case.namespace` (e.g. `common.save`, `auth.forgot_password`).
- `id.json` is the reference; every key present there must also exist in `en.json`.
- Indonesian values should be the most complete, natural phrasing — English may
  paraphrase.
- Do not introduce new namespaces without updating both locale files.

## Migration path

Existing hard-coded strings across the app are NOT migrated yet. Wrap them
incrementally (per-feature PRs) as features are touched; there is no big-bang
rewrite planned in this scaffold.
