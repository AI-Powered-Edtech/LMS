## 2024-05-20 - Fix Overly Permissive CORS Configuration
**Vulnerability:** Edge functions (`ai-grade-essay` and `generate-ai-content`) had a hardcoded `Access-Control-Allow-Origin: '*'` header, which is overly permissive and allows any domain to interact with the API endpoints.
**Learning:** This existed because edge functions default to generic CORS setups during prototyping and development, and the specific `CORS_ORIGIN` environment variable fallback was not uniformly adopted across all functions.
**Prevention:** In this codebase, use the established pattern `Deno.env.get('CORS_ORIGIN') ?? '*'` to ensure production environments can restrict origins via environment variables, instead of hardcoding `*`.
