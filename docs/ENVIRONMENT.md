# Environment Variables

Dokumentasi dari semua environment variable yang digunakan dalam aplikasi ini.

| Variable Name          | Description                                              | Example                           | Required |
| ---------------------- | -------------------------------------------------------- | --------------------------------- | -------- |
| VITE_SUPABASE_URL      | Supabase Project URL                                     | https://<PROJECT_REF>.supabase.co | Yes      |
| VITE_SUPABASE_ANON_KEY | Supabase Anon Key                                        | eyJhbGci...                       | Yes      |
| VITE_SENTRY_DSN        | Sentry DSN                                               | https://...                       | No       |
| VITE_SENTRY_ORG        | Sentry Org                                               | edusync                           | No       |
| VITE_SENTRY_PROJECT    | Sentry Project                                           | edusync-lms                       | No       |
| VITE_SENTRY_AUTH_TOKEN | Sentry Auth Token                                        | ...                               | No       |
| VITE_VAPID_PUBLIC_KEY  | VAPID public key untuk Web Push API                      | ...                               | No       |
| VITE_DEV_PASSWORD      | Pre-fill password di Quick Login buttons (halaman login) | ...                               | No       |
