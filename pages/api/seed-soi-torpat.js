/**
 * POST /api/seed-soi-torpat
 *
 * Lisää "Soi torpat ja salongit" -tapahtuman + kaikki 10 markkinointitoimenpidettä.
 * Idempotent: jos tapahtuma on olemassa, poistetaan ensin ja lisätään uudelleen.
 *
 * Käyttö: fetch('/api/seed-soi-torpat', { method: 'POST' })
 */
import { createClient } from '@supabase/supabase-js';

// insertSafe – automaattinen retry puuttuville sarakkeille
async function insertSafe(client, table, payload, useSingle = false, depth = 0) {
  if (depth > 8) return { data: null, error: { message: 'Liikaa puuttuvia sarakkeita taulusta ' + table } };
  const result = useSingle
    ? await client.from(table).insert(payload).select().single()
    : await client.from(table).insert(payload);
  if (result.error && result.error.message && result.error.message.includes('does not exist')) {
    const match = result.error.message.match(/column "(\w+)"/);
    if (match) {
      const col = match[1];
      console.warn(`[insertSafe] "${col}" puuttee "${table}" – poistetaan ja yritetään (yritys ${depth + 1})`);
      const stripped = Array.isArray(payload)
        ? payload.map(p => { const copy = { ...p }; delete copy[col]; return copy; })
        : (() => { const copy = { ...payload }; delete copy[col]; return copy; })();
      return insertSafe(client, table, stripped, useSingle, depth + 1);
    }
  }
  return result;
}

function calcDeadline(eventDateStr, daysBefore) {
  const [y, m, d] = eventDateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - daysBefore);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

const marketingOperations = [
  { channel: 'instagram',      name: 'Instagram Feed -postaus',   daysBeforeEvent: 7,  defaultTime: '12:00' },
  { channel: 'instagram',      name: 'Instagram Reels',           daysBeforeEvent: 5,  defaultTime: '14:00' },
  { channel: 'instagram',      name: 'Instagram Story',           daysBeforeEvent: 1,  defaultTime: '18:00' },
  { channel: 'facebook',       name: 'Facebook -postaus',         daysBeforeEvent: 5,  defaultTime: '10:00' },
  { channel: 'facebook',       name: 'Facebook Event',            daysBeforeEvent: 14, defaultTime: '11:00' },
  { channel: 'tiktok',         name: 'TikTok -video',             daysBeforeEvent: 4,  defaultTime: '16:00' },
  { channel: 'newsletter',     name: 'Uutiskirje',                daysBeforeEvent: 7,  defaultTime: '09:00' },
  { channel: 'print',          name: 'Printit (julisteet)',        daysBeforeEvent: 21, defaultTime: '10:00' },
  { channel: 'ts-meno',        name: 'TS Menovinkit',             daysBeforeEvent: 10, defaultTime: '10:00' },
  { channel: 'turku-calendar', name: 'Turun tapahtumakalenteri',  daysBeforeEvent: 28, defaultTime: '10:00' }
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Käytä POST-metodia' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase env-muuttujat puuttevat' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const logs = [];
    const EVENT_DATE = '2026-06-13';
    const EVENT_TIME = '17:00';

    // 1. Poista olemassa oleva (idempotent)
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('title', 'Soi torpat ja salongit')
      .eq('year', 2026);

    if (existing && existing.length > 0) {
      await supabase.from('events').delete().eq('id', existing[0].id);
      logs.push(`Vanha tapahtuma poistettu (id=${existing[0].id})`);
    }

    // 2. INSERT event
    const { data: savedEvent, error: eventError } = await insertSafe(supabase, 'events', {
      title: 'Soi torpat ja salongit',
      artist: 'Maans & Puurtinen',
      summary: 'Duo Maans & Puurtinen esittää kaksikielisen konsert­tin Varsinais-Suomen kansanmusiikissa. Kaksi viulua ja laulu tuovat elämään muinaisuuden balladeja, menuetteja ja valsseja — torpien ja salongin soimava ilta suomen- sekä ruotsin­kielisellä musiikilla.',
      url: 'https://mariannemaans.com/kalenteri-2/',
      year: 2026,
      images: {}
    }, true);

    if (eventError) {
      return res.status(500).json({ error: 'events INSERT epäonnistui', details: eventError.message });
    }
    logs.push(`Tapahtuma tallennettu, id=${savedEvent.id}`);

    // 3. INSERT event_instances
    const { error: instError } = await supabase.from('event_instances').insert({
      event_id: savedEvent.id,
      date: EVENT_DATE,
      start_time: EVENT_TIME,
      end_time: null
    });
    if (instError) {
      return res.status(500).json({ error: 'event_instances INSERT epäonnistui', details: instError.message });
    }
    logs.push('event_instances tallennettu');

    // 4. INSERT tasks (kaikki 10)
    const tasks = marketingOperations.map(op => ({
      event_id: savedEvent.id,
      title: op.name,
      channel: op.channel,
      due_date: calcDeadline(EVENT_DATE, op.daysBeforeEvent),
      due_time: op.defaultTime,
      completed: false,
      content: null,
      assignee: null,
      notes: null
    }));

    const { error: tasksError } = await insertSafe(supabase, 'tasks', tasks);
    if (tasksError) {
      return res.status(500).json({ error: 'tasks INSERT epäonnistui', details: tasksError.message });
    }
    logs.push(`${tasks.length} tehtävää tallennettu`);

    // 5. Verify
    const { data: verify } = await supabase
      .from('events')
      .select('*, event_instances(*), tasks(*)')
      .eq('id', savedEvent.id)
      .single();

    return res.status(200).json({
      success: true,
      logs,
      event: {
        id: verify.id,
        title: verify.title,
        artist: verify.artist,
        summary: verify.summary,
        date: verify.event_instances?.[0]?.date,
        time: verify.event_instances?.[0]?.start_time,
        tasksCount: verify.tasks?.length,
        tasks: verify.tasks?.map(t => ({ title: t.title, channel: t.channel, due_date: t.due_date, due_time: t.due_time }))
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Odottamaton virhe', details: err.message });
  }
}
