import { createClient } from '@supabase/supabase-js';

// These environment variables need to be set in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Create a Supabase client for browser-side usage (with anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create a Supabase client with service role key for server-side operations
// This should only be used in secure server contexts (like API routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to check if we're on the server
export const isServer = () => typeof window === 'undefined';
