-- Demo auth account repair
-- Purpose:
-- 1. Ensure known demo email/password accounts have password hashes that match `password123`
-- 2. Normalize nullable auth.users token fields that can break password grant flows in newer Auth versions
-- Scope is intentionally limited to explicit demo/testing emails.

DO $$
DECLARE
  demo_emails text[] := ARRAY[
    'admin@smanusantara.dev',
    'guru.matematika@smanusantara.dev',
    'siswa.andi@smanusantara.dev',
    'admin@edusync.dev',
    'teacher@edusync.dev',
    'student@edusync.dev',
    'admin@demo.edusync.com',
    'teacher@demo.edusync.com',
    'student@demo.edusync.com'
  ];
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt('password123', gen_salt('bf')),
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change = COALESCE(email_change, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      phone_change = COALESCE(phone_change, ''),
      phone_change_token = COALESCE(phone_change_token, ''),
      reauthentication_token = COALESCE(reauthentication_token, ''),
      updated_at = now()
  WHERE email = ANY(demo_emails);
END $$;
