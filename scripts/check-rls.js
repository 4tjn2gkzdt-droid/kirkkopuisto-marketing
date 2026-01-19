// Tarkista Supabase RLS-asetukset events-taulusta
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lataa .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase environment variables missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRLS() {
  console.log('🔍 Checking RLS settings for events table...\n');

  // Testaa lukemista SERVICE_ROLE_KEY:llä
  const { data: eventsWithService, error: serviceError } = await supabase
    .from('events')
    .select('id, title, date')
    .limit(5);

  console.log('📊 Query with SERVICE_ROLE_KEY:');
  console.log('   Events found:', eventsWithService?.length || 0);
  console.log('   Error:', serviceError?.message || 'None');

  if (eventsWithService && eventsWithService.length > 0) {
    console.log('   Sample event:', {
      id: eventsWithService[0].id,
      title: eventsWithService[0].title,
      date: eventsWithService[0].date
    });
  }

  // Testaa lukemista ANON_KEY:llä
  const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: eventsWithAnon, error: anonError } = await anonClient
    .from('events')
    .select('id, title, date')
    .limit(5);

  console.log('\n📊 Query with ANON_KEY:');
  console.log('   Events found:', eventsWithAnon?.length || 0);
  console.log('   Error:', anonError?.message || 'None');

  // Analysoi tulokset
  console.log('\n📋 Analysis:');

  if (serviceError) {
    console.log('❌ SERVICE_ROLE_KEY query failed - this should not happen!');
    console.log('   Error:', serviceError);
  } else if (!eventsWithService || eventsWithService.length === 0) {
    console.log('⚠️  No events found in database');
  } else {
    console.log('✅ SERVICE_ROLE_KEY can read events');
  }

  if (anonError) {
    console.log('⚠️  ANON_KEY query failed - this is expected if RLS is enabled');
    console.log('   Error:', anonError.message);
    console.log('\n💡 Solution: Frontend should not query events directly.');
    console.log('   It should use API routes that use SERVICE_ROLE_KEY.');
  } else if (!eventsWithAnon || eventsWithAnon.length === 0) {
    console.log('⚠️  ANON_KEY cannot see events (RLS blocking)');
  } else {
    console.log('✅ ANON_KEY can read events (RLS allows public read)');
  }

  // Jos SERVICE_ROLE_KEY toimii, kokeillaan hakea tapahtumat ID:llä
  if (eventsWithService && eventsWithService.length > 0) {
    console.log('\n🔍 Testing fetch by ID...');
    const testIds = eventsWithService.slice(0, 2).map(e => e.id);
    console.log('   Test IDs:', testIds);

    const { data: eventsById, error: byIdError } = await supabase
      .from('events')
      .select('*')
      .in('id', testIds);

    console.log('   Events found by ID:', eventsById?.length || 0);
    console.log('   Error:', byIdError?.message || 'None');

    if (eventsById && eventsById.length > 0) {
      console.log('   ✅ Fetch by ID works!');
    } else {
      console.log('   ❌ Fetch by ID failed');
    }
  }
}

checkRLS().catch(console.error);
