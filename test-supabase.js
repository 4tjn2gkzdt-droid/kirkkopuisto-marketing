// Test Supabase connection
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('\n=== SUPABASE YHTEYDEN TESTAUS ===\n');
console.log('URL:', supabaseUrl);
console.log('Key olemassa:', !!supabaseKey);
console.log('Key pituus:', supabaseKey ? supabaseKey.length : 0);
console.log('Key alku:', supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'ei avainta');

if (!supabaseUrl || !supabaseKey) {
  console.log('\n❌ VIRHE: Ympäristömuuttujat puuttuvat!\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('\n✅ Supabase client luotu\n');

async function testConnection() {
  try {
    console.log('Testataan yhteyttä tietokantaan...\n');

    const { data, error, count } = await supabase
      .from('events')
      .select('*', { count: 'exact' })
      .limit(5);

    if (error) {
      console.log('❌ VIRHE yhteydessä:');
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
      console.log('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ YHTEYS TOIMII!');
      console.log('Tapahtumia tietokannassa:', count);
      console.log('Haetut tapahtumat:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.log('❌ POIKKEUS:', err.message);
    console.log(err);
  }
}

testConnection().then(() => {
  console.log('\n=== TESTI VALMIS ===\n');
  process.exit(0);
});
