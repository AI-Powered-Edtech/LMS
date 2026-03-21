-- =============================================================================
-- seed_users.sql
-- Seed auth users for demo/development environment
-- =============================================================================
-- ORDER: Run seed_base.sql FIRST, then this file, then seed_demo.sql
-- =============================================================================
--
-- This inserts directly into auth.users to create demo accounts.
-- Password for all accounts: password123
--
-- NOTE: This only works when executed as a superuser (e.g., via Supabase SQL
-- Editor or `supabase db push`). If you prefer, you can skip this file and
-- create users manually in Supabase Dashboard → Authentication → Users.
-- =============================================================================

DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Get the demo tenant ID (must run seed_base.sql first)
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'demo-school' LIMIT 1;

  -- If not found, fall back to the default tenant from migration 825
  IF v_tenant_id IS NULL THEN
    v_tenant_id := '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE 'Demo tenant not found, using default tenant %', v_tenant_id;
  END IF;

  -- Create Teacher
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'teacher@demo.edusync.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, recovery_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'teacher@demo.edusync.com',
      -- bcrypt hash of 'password123' (cost 10)
      '$2b$10$K8xwM9PERo855j1Ykh4uMetEb.NLorMqE4u3alW9oksdgA/77suhO',
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('first_name', 'Demo', 'last_name', 'Teacher', 'tenant_id', v_tenant_id),
      now(), now(),
      '', '', '', ''
    );
    RAISE NOTICE 'Created teacher@demo.edusync.com';
  ELSE
    RAISE NOTICE 'teacher@demo.edusync.com already exists, skipping';
  END IF;

  -- Create Student
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student@demo.edusync.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, recovery_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'student@demo.edusync.com',
      -- bcrypt hash of 'password123' (cost 10)
      '$2b$10$K8xwM9PERo855j1Ykh4uMetEb.NLorMqE4u3alW9oksdgA/77suhO',
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('first_name', 'Demo', 'last_name', 'Student', 'tenant_id', v_tenant_id),
      now(), now(),
      '', '', '', ''
    );
    RAISE NOTICE 'Created student@demo.edusync.com';
  ELSE
    RAISE NOTICE 'student@demo.edusync.com already exists, skipping';
  END IF;

  -- Create Admin
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@demo.edusync.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, recovery_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@demo.edusync.com',
      -- bcrypt hash of 'password123' (cost 10)
      '$2b$10$K8xwM9PERo855j1Ykh4uMetEb.NLorMqE4u3alW9oksdgA/77suhO',
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('first_name', 'Demo', 'last_name', 'Admin', 'tenant_id', v_tenant_id),
      now(), now(),
      '', '', '', ''
    );
    RAISE NOTICE 'Created admin@demo.edusync.com';
  ELSE
    RAISE NOTICE 'admin@demo.edusync.com already exists, skipping';
  END IF;

END $$;
