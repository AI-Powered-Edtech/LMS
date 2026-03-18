-- Seed mandatory auth users for demo environment
-- This bypasses GoTrue for local development seeding
DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Get the demo tenant ID (must run seed_base.sql first)
  SELECT id INTO v_tenant_id FROM public.tenants WHERE slug = 'demo-school' LIMIT 1;
  
  -- If not found, use a fallback but warn
  IF v_tenant_id IS NULL THEN
    v_tenant_id := '00000000-0000-0000-0000-000000000001';
    -- Create fallback tenant if needed for the profiles table
    INSERT INTO public.tenants (id, name, slug) 
    VALUES (v_tenant_id, 'Fallback Tenant', 'fallback')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Create Teacher
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'teacher@demo.edusync.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'teacher@demo.edusync.com',
      -- Password is 'password123'
      '$2a$10$abcdefghijklmnopqrstuv', 
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('first_name', 'Demo', 'last_name', 'Teacher', 'tenant_id', v_tenant_id),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;

  -- Create Student
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student@demo.edusync.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'student@demo.edusync.com',
      -- Password is 'password123'
      '$2a$10$abcdefghijklmnopqrstuv',
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('first_name', 'Demo', 'last_name', 'Student', 'tenant_id', v_tenant_id),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  END IF;
END $$;
