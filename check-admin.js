// Tarkista käyttäjän admin-oikeudet
// Aja: node check-admin.js YOUR_EMAIL

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Virhe: NEXT_PUBLIC_SUPABASE_URL ja NEXT_PUBLIC_SUPABASE_ANON_KEY ympäristömuuttujat vaaditaan');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllUsers() {
  console.log('\n📋 KAIKKI KÄYTTÄJÄT TIETOKANNASSA:\n');

  try {
    const { data: allUsers, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Virhe ladattaessa käyttäjiä:', error.message);
      process.exit(1);
    }

    if (!allUsers || allUsers.length === 0) {
      console.log('❌ Ei käyttäjiä tietokannassa!');
      process.exit(1);
    }

    console.log('═══════════════════════════════════════════════════════════════════════════════════');
    allUsers.forEach((user, i) => {
      const adminBadge = user.is_admin ? '👑 ADMIN' : '👤 USER ';
      console.log(`\n${i + 1}. ${adminBadge} - ${user.email}`);
      console.log(`   Nimi: ${user.full_name}`);
      console.log(`   ID:   ${user.id}`);
      console.log(`   Luotu: ${new Date(user.created_at).toLocaleString('fi-FI')}`);
    });
    console.log('\n═══════════════════════════════════════════════════════════════════════════════════');

    console.log('\n💡 Aseta käyttäjä adminiksi ajamalla:');
    console.log('   node check-admin.js USER@EMAIL.COM');
    console.log('\nTai aja Supabase SQL Editor:ssa:');
    console.log('   UPDATE user_profiles SET is_admin = true WHERE email = \'USER@EMAIL.COM\';');
    console.log('\n');

  } catch (err) {
    console.error('❌ Odottamaton virhe:', err);
    process.exit(1);
  }
}

async function checkAdmin(email) {
  if (!email) {
    // Jos ei anneta sähköpostia, listaa kaikki käyttäjät
    await listAllUsers();
    return;
  }

  console.log(`\n🔍 Haetaan käyttäjää: ${email}\n`);

  try {
    // Hae käyttäjäprofiili
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('❌ Virhe:', error.message);

      if (error.code === 'PGRST116') {
        console.log('\n⚠️  Profiilia ei löytynyt tälle sähköpostille!');
        console.log('\nKorjaa ajamalla Supabase SQL Editor:ssa:');
        console.log('-------------------------------------------');
        console.log(`INSERT INTO user_profiles (email, full_name, is_admin)`);
        console.log(`VALUES ('${email}', 'Admin Käyttäjä', true)`);
        console.log(`ON CONFLICT (email) DO UPDATE SET is_admin = true;`);
        console.log('-------------------------------------------\n');
      }

      process.exit(1);
    }

    if (!data) {
      console.log('❌ Profiilia ei löytynyt.');
      process.exit(1);
    }

    // Näytä profiilitiedot
    console.log('✅ PROFIILI LÖYTYI!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  ID:           ${data.id}`);
    console.log(`  Email:        ${data.email}`);
    console.log(`  Nimi:         ${data.full_name}`);
    console.log(`  Admin:        ${data.is_admin ? '✅ KYLLÄ' : '❌ EI'}`);
    console.log(`  Luotu:        ${new Date(data.created_at).toLocaleString('fi-FI')}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (data.is_admin) {
      console.log('🎉 Sinulla ON admin-oikeudet!');
      console.log('\nJos et pääse admin-paneeliin (/admin):');
      console.log('  1. Kirjaudu ULOS ja takaisin SISÄÄN');
      console.log('  2. Tyhjennä selaimen välimuisti (Ctrl+Shift+R tai Cmd+Shift+R)');
      console.log('  3. Kokeile avata suoraan: http://localhost:3000/admin');
    } else {
      console.log('❌ Sinulla EI OLE admin-oikeuksia!');
      console.log('\nKorjaa ajamalla Supabase SQL Editor:ssa:');
      console.log('-------------------------------------------');
      console.log(`UPDATE user_profiles`);
      console.log(`SET is_admin = true`);
      console.log(`WHERE id = '${data.id}';`);
      console.log('-------------------------------------------');
      console.log('\nSen jälkeen kirjaudu ulos ja takaisin sisään.\n');
    }

    // Näytä kaikki käyttäjät
    console.log('\n📋 KAIKKI KÄYTTÄJÄT TIETOKANNASSA:\n');
    const { data: allUsers, error: allError } = await supabase
      .from('user_profiles')
      .select('email, full_name, is_admin')
      .order('created_at', { ascending: true });

    if (allError) {
      console.error('Virhe ladattaessa käyttäjiä:', allError.message);
    } else {
      allUsers.forEach((user, i) => {
        const adminBadge = user.is_admin ? '👑 ADMIN' : '   user';
        console.log(`  ${i + 1}. ${adminBadge}  ${user.email.padEnd(40)} (${user.full_name})`);
      });
    }

    console.log('\n');

  } catch (err) {
    console.error('❌ Odottamaton virhe:', err);
    process.exit(1);
  }
}

// Aja
const email = process.argv[2];
checkAdmin(email);
