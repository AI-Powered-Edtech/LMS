import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Graceful degradation to avoid white screen of death during module evaluation.
// Client will still work but queries will fail, which can be handled by the UI.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
