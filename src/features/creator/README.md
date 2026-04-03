# Creator — Feature Module

AI content generation untuk kursus, modul, dan pelajaran

## Arsitektur

```
src/features/creator/
└── api/           # Creator service (creatorService.ts)
```

## Status

**Complete** — AI content generation via `generate-ai-content` Edge Function.

## Key Files

| File                    | Purpose                                   |
| ----------------------- | ----------------------------------------- |
| `api/creatorService.ts` | Wraps `generate-ai-content` Edge Function |

## Edge Function

| Function              | Purpose               | Auth     |
| --------------------- | --------------------- | -------- |
| `generate-ai-content` | AI content generation | User JWT |

## Pages

- `src/pages/Creator.tsx` — AI content creation page (teacher/admin)
