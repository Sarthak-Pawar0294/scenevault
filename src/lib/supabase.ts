import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Strict validation for environment variables
if (!supabaseUrl || typeof supabaseUrl !== 'string' || !supabaseUrl.startsWith('https://')) {
  throw new Error('Invalid or missing VITE_SUPABASE_URL. Must be a valid HTTPS URL.');
}

if (!supabaseAnonKey || typeof supabaseAnonKey !== 'string' || supabaseAnonKey.length < 20) {
  throw new Error('Invalid or missing VITE_SUPABASE_ANON_KEY. Must be a non-empty string.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
