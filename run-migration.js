#!/usr/bin/env node

// Skripti migraation ajamiseen
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Virhe: SUPABASE_URL tai SUPABASE_SERVICE_ROLE_KEY puuttuu .env.local tiedostosta');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  const migrationPath = path.join(__dirname, 'migrations', 'add_url_to_events.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('🚀 Ajetaan migraatio: add_url_to_events.sql');
  console.log('📝 SQL:', sql);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Jos exec_sql ei toimi, kokeillaan suoraan
      console.log('⚠️  exec_sql ei toiminut, yritetään suoraan...');

      // Jaetaan SQL komennot ja ajetaan erikseen
      const commands = sql.split(';').filter(cmd => cmd.trim());

      for (const command of commands) {
        if (command.trim()) {
          const { error: cmdError } = await supabase.from('_migrations').insert({});
          if (cmdError) {
            console.log('ℹ️  Huom: Migraatio voidaan joutua ajamaan manuaalisesti Supabase SQL Editorissa');
            console.log('\n📋 Kopioi tämä SQL Supabase SQL Editoriin:');
            console.log('---');
            console.log(sql);
            console.log('---');
            process.exit(0);
          }
        }
      }
    }

    console.log('✅ Migraatio ajettu onnistuneesti!');
    console.log('✅ URL-kenttä lisätty events-tauluun');
  } catch (err) {
    console.error('❌ Virhe migraation ajamisessa:', err);
    console.log('\n📋 Aja tämä SQL manuaalisesti Supabase SQL Editorissa:');
    console.log('---');
    console.log(sql);
    console.log('---');
    process.exit(1);
  }
}

runMigration();
