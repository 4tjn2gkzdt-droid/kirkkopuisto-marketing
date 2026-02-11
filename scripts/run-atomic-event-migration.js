/**
 * Ajaa atomic event insert -migraation Supabasessa
 */
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Puuttuvat env-muuttujat')
    console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING')
    console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('📂 Luetaan migraatiotiedosto...')
  const migrationPath = path.join(__dirname, '../migrations/20260206_atomic_event_insert.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log('🚀 Ajetaan migraatio...')

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // Jos exec_sql ei ole käytettävissä, kokeillaan suoraa SQL-kyselyä
      console.log('⚠️ exec_sql ei ole käytössä, yritetään suoraa kyselyä...')

      // Supabase ei tue suoraa SQL-kyselyä client-puolella
      // Käyttäjän pitää ajaa migraatio manuaalisesti Supabase Dashboardissa
      console.log('\n📋 Kopioi seuraava SQL Supabase SQL Editoriin:\n')
      console.log('─'.repeat(80))
      console.log(sql)
      console.log('─'.repeat(80))
      console.log('\n✅ Avaa: https://supabase.com/dashboard/project/[PROJECT_ID]/sql/new')
      console.log('✅ Liitä yllä oleva SQL ja klikkaa "Run"')
      process.exit(0)
    }

    console.log('✅ Migraatio ajettu onnistuneesti!')
    console.log('📊 Tulos:', data)
  } catch (err) {
    console.error('❌ Virhe migraation ajossa:', err.message)
    console.log('\n📋 Aja migraatio manuaalisesti Supabase Dashboardissa:')
    console.log(sql)
    process.exit(1)
  }
}

runMigration()
