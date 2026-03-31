// Shared authentication helper for EduSync Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface AuthResult {
  supabase: ReturnType<typeof createClient>
  user: {
    id: string
    user_metadata: Record<string, unknown>
    app_metadata: Record<string, unknown>
  }
}

/**
 * Authenticates a request using the Authorization header.
 * Throws 'AUTH_MISSING' if no auth header present.
 * Throws 'AUTH_INVALID' if token is invalid or user not found.
 * Throws 'SUPABASE_CONFIG_MISSING' if env vars not set.
 */
export async function authenticate(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('AUTH_MISSING')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('SUPABASE_CONFIG_MISSING')
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error('AUTH_INVALID')

  return { supabase, user: user as AuthResult['user'] }
}
