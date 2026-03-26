import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Public client (reads only, subject to RLS)
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

// Admin client (bypasses RLS, for server-side API routes only)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseServiceKey)
  : supabase;
