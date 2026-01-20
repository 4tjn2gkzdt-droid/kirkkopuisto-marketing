const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xygwnxithawewlqatold.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5Z3dueGl0aGF3ZXdscWF0b2xkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjM3NzMsImV4cCI6MjA4MzczOTc3M30.gU6bTb72AcHnGGsZRnHItpR4c4BnH1tQxvshYsqP180'
);

async function listEvents() {
  try {
    // Hae kaikki tapahtumat
    const { data: allEvents, error: allError } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });

    if (allError) {
      console.error('Error fetching all events:', allError);
      return;
    }

    console.log('\n=== KAIKKI TAPAHTUMAT ===');
    console.log(`Yhteensä ${allEvents?.length || 0} tapahtumaa\n`);

    if (allEvents && allEvents.length > 0) {
      allEvents.forEach(event => {
        console.log(`- ${event.title} (${event.date})`);
      });
    }

    // Etsi Turku Craft Beer Festival
    const craftBeer = allEvents?.find(e =>
      e.title?.toLowerCase().includes('craft beer') ||
      e.title?.toLowerCase().includes('turku craft')
    );

    if (craftBeer) {
      console.log('\n=== TURKU CRAFT BEER FESTIVAL LÖYTYI ===');
      console.log(JSON.stringify(craftBeer, null, 2));
    } else {
      console.log('\n=== TURKU CRAFT BEER FESTIVAL EI LÖYTYNYT ===');
      console.log('Lisätään se nyt...\n');

      // Lisätään tapahtuma
      const { data: newEvent, error: insertError } = await supabase
        .from('events')
        .insert({
          title: 'Turku Craft Beer Festival',
          date: '2026-08-15',
          time: '18:00',
          artist: '',
          event_type: 'other',
          summary: 'Turun suurin craft-olutfestivaali! Nauti parhaisista kotimaisista ja kansainvälisistä pienpanimoista.',
          user_id: null
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting event:', insertError);
      } else {
        console.log('Tapahtuma lisätty!');
        console.log(JSON.stringify(newEvent, null, 2));
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

listEvents();
