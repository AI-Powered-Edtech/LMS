# EduSync LMS Feature Toggles

This document outlines the architecture for managing and enforcing Feature Toggles per tenant within the EduSync LMS platform. 

## Concept

EduSync is a multi-tenant Modular LMS. Not all tenants (schools) will have access to all features (e.g., School A has only Core Courses, School B has Courses + Quizzes, School C has all features including AI capabilities). Feature Toggles allow enabling or disabling parts of the platform dynamically without redeploying the application.

```text
Tenant
   │
   └── Feature Flags
            │
            ├── Quiz
            ├── Assignment
            ├── Discussion
            ├── AI Tutor
            └── Analytics
```

## Core Tables

These tables reside in the Supabase PostgreSQL database.

### `features`

A dictionary of all available LMS features.

```sql
create table features (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  created_at timestamptz default now()
);
```

### `tenant_features`

The mapping of which features are active for which tenants.

```sql
create table tenant_features (
  tenant_id uuid not null,
  feature_key text not null,
  enabled boolean default true,
  config jsonb,
  created_at timestamptz default now(),
  primary key (tenant_id, feature_key)
);
```

## Security & Architecture Enforcement

Feature Toggles must be enforced at **both** the frontend layers and the database layers.

### 1. Database Layer Check (Supabase RLS)

To avoid a costly JOIN against `tenant_features` on every single row insertion/selection in related tables, we inject the tenant's features directly into their JWT at login via a **Supabase Custom Auth Hook** (Edge Function).

Example injected JWT Token (`auth.jwt`):
```json
{
  "tenant_id": "uuid-school-a",
  "app_metadata": {
    "features": ["quiz", "analytics"]
  }
}
```

This makes Row-Level Security checks lightning fast. To avoid repetitive and potentially slow raw JSONB extraction in policies, we create a stable helper function:

```sql
CREATE FUNCTION has_feature(feature text)
RETURNS boolean AS $$
SELECT auth.jwt() -> 'app_metadata' -> 'features' ? feature;
$$ LANGUAGE sql STABLE;
```

Now, the RLS policy becomes clean and performant:

```sql
create policy "Insert requires active quiz feature"
on quiz_attempts for insert
with check (has_feature('quiz'));
```

### 2. Service Layer Check

If an Edge Function or Backend Service handles a request:
```ts
if (!isFeatureEnabled("quiz")) {
   throw new Error("Feature disabled");
}
```

### 3. Frontend Presentation Check

In React, checking the active feature set determines if components like sidebars, viewers, or creation buttons render.

```tsx
const { features } = useFeatures();

// Component Rendering
{features.quiz && <QuizViewer />}

// Resource Rendering (Smart Player Filtering)
if (resource.type === "quiz" && !features.quiz) {
   return null;
}
```

## Scalability Benefits
*   **Zero Deployments**: Features can be turned on/off dynamically by admins.
*   **Pricing Plans**: Easily support Basic, Pro, and Enterprise tiers based purely on toggle configurations.
*   **Future Proofing**: Usable for A/B testing, beta features, or rolling out experimental AI capabilities slowly.
