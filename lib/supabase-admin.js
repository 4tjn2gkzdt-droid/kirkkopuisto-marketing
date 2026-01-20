import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with SERVICE_ROLE_KEY
// VAIN API-routeissa! Täydet oikeudet tietokantaan.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Debug logging
if (typeof window === 'undefined') {
  console.log('[supabase-admin] Initializing...');
  console.log('[supabase-admin] URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.log('[supabase-admin] Service Key:', supabaseServiceKey ? 'SET' : 'MISSING');
}

// Create client or null if env vars missing - let API routes handle the error
let supabaseAdmin = null;

if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  console.log('[supabase-admin] Client created successfully');
} else {
  console.error('[supabase-admin] Missing environment variables!');
  console.error('[supabase-admin] URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('[supabase-admin] Key:', supabaseServiceKey ? 'SET' : 'MISSING');
}

export { supabaseAdmin };
