import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Graceful degradation to avoid white screen of death during module evaluation.
// Client will still work but queries will fail, which can be handled by the UI.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
// NOTE: Previously exposed `window.supabase` in DEV for browser console testing.
// Removed: attackers could call Supabase directly bypassing all client-side checks.
// For debugging, use Supabase Dashboard → Table Editor or SQL Editor instead.
