// Skripti duplikaattitapahtumien poistamiseen
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xygwnxithawewlqatold.supabase.co';
const supabaseKey = 'sb_publishable_owvsPZGK3PqG_aHU5CoA0w_C15vwcMQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function removeDuplicates() {
  console.log('🔍 Etsitään duplikaatteja...\n');

  // Hae kaikki tapahtumat
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Virhe:', error);
    return;
  }

  console.log(`📊 Löydettiin ${events.length} tapahtumaa yhteensä\n`);

  // Ryhmittele tapahtumat päivämäärän ja nimen mukaan
  const eventGroups = {};

  for (const event of events) {
    const key = `${event.date}|${event.title}`;
    if (!eventGroups[key]) {
      eventGroups[key] = [];
    }
    eventGroups[key].push(event);
  }

  // Etsi duplikaatit
  const duplicatesToDelete = [];

  for (const [key, group] of Object.entries(eventGroups)) {
    if (group.length > 1) {
      // Pidä ensimmäinen (vanhin created_at), poista loput
      const [keep, ...remove] = group;
      console.log(`🔄 Duplikaatti löydetty: ${keep.title} (${keep.date})`);
      console.log(`   Pidetään: ID ${keep.id} (luotu: ${keep.created_at})`);

      for (const dup of remove) {
        console.log(`   ❌ Poistetaan: ID ${dup.id} (luotu: ${dup.created_at})`);
        duplicatesToDelete.push(dup.id);
      }
      console.log('');
    }
  }

  if (duplicatesToDelete.length === 0) {
    console.log('✅ Ei duplikaatteja löytynyt!');
    return;
  }

  console.log(`\n📋 Yhteensä ${duplicatesToDelete.length} duplikaattia poistettavaksi\n`);
  console.log('⏳ Poistetaan duplikaatit...\n');

  // Poista duplikaatit
  for (const id of duplicatesToDelete) {
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error(`❌ Virhe poistettaessa ID ${id}:`, deleteError);
    } else {
      console.log(`✅ Poistettu ID ${id}`);
    }
  }

  console.log(`\n✨ Valmis! Poistettu ${duplicatesToDelete.length} duplikaattia.`);
}

removeDuplicates().catch(console.error);
