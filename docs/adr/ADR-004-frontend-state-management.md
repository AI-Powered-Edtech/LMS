# ADR-004: Frontend State Management Strategy (React Query + Zustand)

**Status:** Accepted
**Date:** 2026-01-20
**Deciders:** Engineering Team

---

## Context

EduSync's frontend needs to manage two distinct categories of state:

1. **Server state** — data fetched from Supabase (courses, lessons, user profile, quiz questions, leaderboard). This state is remote, asynchronous, and shared across multiple components. It needs caching, background refetching, loading/error states, and cache invalidation.

2. **Local UI state** — transient state that does not need to persist to the server and is scoped to a specific feature (e.g., the quiz player's current question index, selected answer, timer countdown, video player's current position buffer).

Options considered:

- **Option A:** Redux Toolkit (RTK Query for server state, Redux slice for local state)
- **Option B:** React Query v5 for server state + Context API for local state
- **Option C:** React Query v5 for server state + Zustand v5 for local feature state
- **Option D:** SWR for server state + useState/useReducer for local state

---

## Decision

We chose **Option C: React Query v5 (TanStack Query) for server state + Zustand v5 for scoped local feature state**.

**Division of responsibility:**

| State Type | Tool | Location |
|---|---|---|
| Server data (courses, profile, quiz data) | React Query | `src/features/{domain}/queries/` |
| Global auth state | React Context (`AuthContext`) | `src/contexts/AuthContext.tsx` |
| Feature-scoped transient state (quiz player) | Zustand store | `src/features/{domain}/store/` |
| Theme (dark/light) | React Context (`ThemeContext`) | `src/contexts/ThemeContext.tsx` |
| Simple local component state | `useState` / `useReducer` | Inline in component |

**Rule:** Zustand is **only** used for the quiz player. No other feature should introduce a Zustand store unless there is a documented need for complex, cross-component transient state that does not belong in the server cache.

---

## Rationale

**Why React Query over RTK Query (Option A):**
- React Query v5 has first-class Supabase integration via query keys and invalidation patterns
- No Redux boilerplate — no actions, reducers, or slice setup for simple data fetching
- `useQuery` / `useMutation` / `useInfiniteQuery` map naturally to Supabase's `.select()`, `.insert()`, `.rpc()` patterns
- DevTools available for cache inspection

**Why Zustand over Context API (Option B) for local feature state:**
- Context API causes full subtree re-renders on every state change. The quiz player updates state on every keypress, answer selection, and timer tick — Context would cause O(n) re-renders across all subscribed components
- Zustand uses fine-grained subscriptions: only components that subscribe to a specific slice re-render
- Zustand stores are easy to reset on component unmount (quiz cleanup)
- Zustand is not a global singleton in tests — stores can be reset between test cases

**Why not SWR (Option D):**
- React Query v5 has superior mutation support (optimistic updates, rollback)
- React Query's `queryKey` hierarchy makes cache invalidation explicit and predictable
- The team already had React Query experience

---

## Implementation Rules

### React Query

```typescript
// Query keys must be structured arrays for hierarchical invalidation
const courseKeys = {
  all: ['courses'] as const,
  byTenant: (tenantId: string) => ['courses', tenantId] as const,
  detail: (id: string) => ['courses', 'detail', id] as const,
};

// Invalidate all course queries for a tenant after mutation
queryClient.invalidateQueries({ queryKey: courseKeys.byTenant(tenantId) });
```

- All query keys must live in `src/features/{domain}/queries/keys.ts`
- Mutations must invalidate related query keys on success
- Server errors from Supabase must be translated — never surface raw Supabase error codes to the user

### Zustand

```typescript
// Stores must be scoped to a feature — never import a quiz store in a course component
// Store must be reset on unmount to prevent stale state
useEffect(() => {
  return () => useQuizStore.getState().reset();
}, []);
```

- Zustand stores live in `src/features/{domain}/store/`
- Each store must export a `reset()` action called on component unmount
- Do not put server data in Zustand — that belongs in React Query

### Context API

- `AuthContext` holds user identity (user, profile, role, tenantId) — fetched once on mount
- `ThemeContext` holds dark/light preference — persisted to `localStorage`
- Do not add new global contexts for feature data

---

## Consequences

**Positive:**
- Server cache is always consistent — React Query handles deduplication, background refresh, and stale-while-revalidate
- Quiz player re-renders are minimal — Zustand subscriptions are O(1) per subscriber
- No Redux boilerplate — new features add a `queries/` folder, not a `reducers/` folder
- Cache invalidation is explicit and testable

**Negative:**
- Two state libraries (`react-query` + `zustand`) must be understood by all contributors
- Zustand misuse (storing server data in a Zustand store) can cause cache inconsistency — requires code review discipline
- React Query devtools add ~50KB to the dev bundle (tree-shaken in production)
- Context API for auth/theme means the entire tree re-renders on login/logout (acceptable — this is infrequent)
