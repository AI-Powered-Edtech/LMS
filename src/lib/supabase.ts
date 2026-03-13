import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// We don't throw here to avoid a total white screen crash during module evaluation.
// Instead, createClient will still work but queries will fail, which can be handled by the UI.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
