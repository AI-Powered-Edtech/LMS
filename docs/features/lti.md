# EduSync LMS — LTI 1.3 Integration Guide

LTI (Learning Tools Interoperability) 1.3 memungkinkan platform eksternal (Canvas, Moodle, Blackboard) me-launch kursus EduSync sebagai embedded tool.

## Environment Variables

| Variable | Required | Deskripsi |
| --- | --- | --- |
| `LTI_RSA_PRIVATE_KEY` | ✅ | RSA private key (PEM format) untuk JWT signing |
| `LTI_RSA_PUBLIC_KEY` | ✅ | RSA public key (PEM format) untuk JWKS endpoint |
| `LTI_LAUNCH_URL` | ✅ | Full URL endpoint LTI launch, e.g. `https://app.edusync.id/lti/launch` |
| `APP_URL` | ✅ | Base URL aplikasi EduSync, e.g. `https://app.edusync.id` |

## Architecture

    External LMS (Canvas/Moodle)
        → OIDC Login Request → /lti/login
        → Platform Registration lookup (lti_platform_registrations)
        → Nonce stored (lti_nonces) — replay protection
        → LTI Launch JWT validated
        → Guest session created (lti_sessions)
        → Student mapped to Supabase user
        → EduSync course loaded in iframe

## Platform Registration

Daftarkan EduSync sebagai LTI 1.3 tool di platform eksternal dengan URL:

- **OIDC Login URL:** `{APP_URL}/lti/login`
- **Launch URL:** `{LTI_LAUNCH_URL}`
- **JWKS URL:** `{APP_URL}/lti/jwks`
- **Deep Link URL:** `{APP_URL}/lti/deep-link`

Simpan konfigurasi platform di `lti_platform_registrations`:

    INSERT INTO lti_platform_registrations
      (tenant_id, platform_url, client_id, auth_login_url, auth_token_url, key_set_url)
    VALUES (
      '<tenant_uuid>',
      'https://canvas.instructure.com',
      '<platform_client_id>',
      'https://canvas.instructure.com/api/lti/authorize_redirect',
      'https://canvas.instructure.com/login/oauth2/token',
      'https://canvas.instructure.com/api/lti/security/jwks'
    );

## Database Tables

| Table | Purpose |
| --- | --- |
| `lti_platform_registrations` | One row per external platform per tenant |
| `lti_nonces` | Short-lived OIDC replay protection tokens |
| `lti_sessions` | Active LTI guest sessions |

## RLS Policies

- `lti_nonces`: `USING (false)` untuk role `anon` dan `authenticated` — **service_role only**
- `lti_platform_registrations`: tenant-scoped RLS via `get_my_tenant_id()`
- `lti_sessions`: tenant-scoped RLS

## Security Notes

- RSA keys minimal 2048-bit
- **JANGAN** expose `LTI_RSA_PRIVATE_KEY` di client bundle
- Nonces expire setelah 1 jam; dibersihkan oleh `cleanup_expired_lti_nonces()` via pg_cron

## Migration Reference

| Migration | Description |
| --- | --- |
| `20260324200000` | LTI 1.3 schema: platform registrations, nonces, sessions, RLS |