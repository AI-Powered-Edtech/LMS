# Settings — Feature Module

Pengaturan pengguna: update profile, change password

## Arsitektur

```
src/features/settings/
└── api/           # Settings service layer (settingsService.ts)
```

## Status

**Complete** — Profile dan password update.

## Key Files

| File                     | Purpose                                                         |
| ------------------------ | --------------------------------------------------------------- |
| `api/settingsService.ts` | Wraps `profiles.update` (name) dan `auth.updateUser` (password) |

## Functions

| Function           | Purpose                           |
| ------------------ | --------------------------------- |
| `updateProfile()`  | Update nama profile               |
| `changePassword()` | Update password via auth provider |

## Pages

- `src/pages/Settings.tsx` — Settings page (5 tabs: Account, Notifications, Security, Appearance, Language)
- `src/pages/SettingsTabs.tsx` — Tab navigation component
