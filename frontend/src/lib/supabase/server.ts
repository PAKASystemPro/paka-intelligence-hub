import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These environment variables are only available on the server
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Admin client for server-side usage (with service role key)
// Note: this should only be used in server-side code (i.e., API routes, server components)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'production' },
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
