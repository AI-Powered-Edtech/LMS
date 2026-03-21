-- P0.0: Fix custom_access_token_hook to properly inject tenant_id into JWT
-- This migration properly implements JWT tenant_id injection for multi-tenant architecture
-- The previous implementation was a no-op that just returned the event unchanged

CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
  v_custom_claims jsonb;
BEGIN
  -- Extract user_id from the event
  v_user_id := (event->>'user_id')::uuid;
  
  -- Only proceed if we have a valid user_id
  IF v_user_id IS NOT NULL THEN
    -- Get tenant_id from profiles table
    -- This SECURITY DEFINER function runs with postgres privileges, so it bypasses RLS
    SELECT p.tenant_id INTO v_tenant_id
    FROM public.profiles p
    WHERE p.id = v_user_id;
    
    -- If we found a tenant_id, inject it into custom_claims
    IF v_tenant_id IS NOT NULL THEN
      -- Get existing custom_claims or create empty object
      v_custom_claims := COALESCE(event->'custom_claims', '{}'::jsonb);
      
      -- Add tenant_id to custom_claims
      v_custom_claims := jsonb_set(v_custom_claims, '{tenant_id}', to_jsonb(v_tenant_id));
      
      -- Update the event with the new custom_claims
      event := jsonb_set(event, '{custom_claims}', v_custom_claims);
    END IF;
  END IF;
  
  RETURN event;
END;
$$;

ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";

-- Grant execute to authenticated role so it can be used by Supabase auth
GRANT EXECUTE ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "anon";
