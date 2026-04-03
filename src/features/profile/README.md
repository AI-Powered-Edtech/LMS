# Profile — Feature Module

Manajemen profil pengguna: info personal, avatar, privacy settings

## Arsitektur

```
src/features/profile/
├── api/           # Profile service layer
├── components/    # React components
├── hooks/         # Custom React hooks
└── index.ts       # Public barrel export
```

## Status

**Complete** — Profile viewing and editing.

## Pages

- `src/pages/Profile.tsx` — User profile
- `src/pages/PublicProfile.tsx` — Public profile view
- `src/pages/Settings.tsx` — Settings (account, security, appearance)
- `src/pages/SettingsTabs.tsx` — Settings tab navigation

## Related

- Settings API berada di `src/features/settings/api/`
- Auth context di `src/contexts/AuthContext.tsx`
