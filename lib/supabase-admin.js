import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with SERVICE_ROLE_KEY
// VAIN API-routeissa! Täydet oikeudet tietokantaan.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase SERVICE_ROLE_KEY environment variables missing');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
