import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with environment variables
// These will need to be set in your .env.local file

// Supabase URL and anon key - for client-side usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Supabase service role key - for server-side usage only
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client for browser usage (with anon key)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'production' }
});

// Admin client for server-side usage (with service role key)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'production' }
});

/**
 * This file is deprecated. Please use supabase-client.js instead.
 * 
 * This file is kept for compatibility reasons but all functionality has been moved to supabase-client.js
 */

// Re-export from supabase-client.js
export { fetchCohortData, fetchCohortCustomers } from './supabase-client';






