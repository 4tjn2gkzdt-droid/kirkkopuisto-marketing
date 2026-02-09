/**
 * POST /api/events
 *
 * Luo uuden tapahtuman + päivämäärät + tehtävät ATOMISESTI yhden RPC-funktion kautta.
 * Käyttää supabaseAdmin (service_role) → ei token-refresh -ongelmia, nopea yhteys.
 * Atominen transaktio: joko kaikki onnistuu tai mikään ei tallennu.
 */
import { supabaseAdmin } from '../../lib/supabase-admin'

// Sallitut alkuperät CORS:lle
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://kirkkopuisto-marketing.vercel.app',
  process.env.NEXT_PUBLIC_SITE_URL,
].filter(Boolean)

export const config = {
  api: {
    maxDuration: 10,
  },
}

// Fallback-metodi: käyttää suoria INSERT-kutsuja jos RPC-funktio ei ole käytettävissä
// HUOM: Ei atominen - jos jokin INSERT epäonnistuu, aiemmat jäävät kantaan
async function fallbackInsert(req, res, { title, artist, summary, url, year, dates, tasks, createdBy }) {
  try {
    console.log('[fallbackInsert] Aloitetaan fallback-tallennus')

    // 1. Luo master-tapahtuma
    const { data: eventData, error: eventError } = await supabaseAdmin
      .from('events')
      .insert({
        title: title.trim(),
        artist: artist || null,
        summary: summary || null,
        url: url || null,
        year: year,
        images: {},
        created_by_id: createdBy?.id || null,
        created_by_email: createdBy?.email || null,
        created_by_name: createdBy?.name || null,
      })
      .select()
      .single()

    if (eventError) {
      console.error('[fallbackInsert] Event insert error:', eventError)
      throw eventError
    }

    console.log('[fallbackInsert] Tapahtuma luotu, id:', eventData.id)

    // 2. Luo päivämäärät (event_instances)
    const instancesPayload = dates.map(d => ({
      event_id: eventData.id,
      date: d.date,
      start_time: d.startTime || null,
      end_time: d.endTime || null,
    }))

    const { error: instancesError } = await supabaseAdmin
      .from('event_instances')
      .insert(instancesPayload)

    if (instancesError) {
      console.error('[fallbackInsert] Event instances insert error:', instancesError)
      // Poista tapahtuma jos päivämäärät epäonnistuvat
      await supabaseAdmin.from('events').delete().eq('id', eventData.id)
      throw instancesError
    }

    console.log('[fallbackInsert] Päivämäärät luotu, määrä:', dates.length)

    // 3. Luo tehtävät (jos annettu)
    if (tasks && tasks.length > 0) {
      const tasksPayload = tasks.map(t => ({
        event_id: eventData.id,
        title: t.title,
        channel: t.channel || null,
        due_date: t.dueDate,
        due_time: t.dueTime || null,
        completed: false,
        content: t.content || null,
        assignee: t.assignee || null,
        notes: t.notes || null,
        created_by_id: createdBy?.id || null,
        created_by_email: createdBy?.email || null,
        created_by_name: createdBy?.name || null,
      }))

      const { error: tasksError } = await supabaseAdmin
        .from('tasks')
        .insert(tasksPayload)

      if (tasksError) {
        console.error('[fallbackInsert] Tasks insert error:', tasksError)
        // Poista tapahtuma ja päivämäärät jos tehtävät epäonnistuvat
        await supabaseAdmin.from('event_instances').delete().eq('event_id', eventData.id)
        await supabaseAdmin.from('events').delete().eq('id', eventData.id)
        throw tasksError
      }

      console.log('[fallbackInsert] Tehtävät luotu, määrä:', tasks.length)
    }

    // 4. Hae luotu tapahtuma kaikkine liitoksineen
    const { data: fullEvent, error: fetchError } = await supabaseAdmin
      .from('events')
      .select(`
        *,
        event_instances (*),
        tasks (*)
      `)
      .eq('id', eventData.id)
      .single()

    if (fetchError) {
      console.error('[fallbackInsert] Fetch error:', fetchError)
      throw fetchError
    }

    console.log('[fallbackInsert] Tallennus valmis')

    // Muokkaa vastaus samaan muotoon kuin RPC-funktio palauttaisi
    const result = {
      id: fullEvent.id,
      title: fullEvent.title,
      artist: fullEvent.artist,
      summary: fullEvent.summary,
      url: fullEvent.url,
      year: fullEvent.year,
      images: fullEvent.images,
      created_at: fullEvent.created_at,
      created_by_id: fullEvent.created_by_id,
      created_by_email: fullEvent.created_by_email,
      created_by_name: fullEvent.created_by_name,
      event_instances: fullEvent.event_instances,
      tasks: fullEvent.tasks || [],
    }

    return res.status(201).json({ success: true, event: result })

  } catch (err) {
    console.error('[fallbackInsert] Exception:', err)
    return res.status(500).json({
      error: 'Fallback-tallennus epäonnistui',
      details: err.message
    })
  }
}

export default async function handler(req, res) {
  // CORS-turvallisuus: Tarkista että pyyntö tulee sallitusta alkuperästä
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else if (!origin) {
    // Same-origin pyynnöt (ei origin-headeria)
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0] || 'http://localhost:3000')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Käytä POST-metodia' })

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase ei ole konfiguroitu. Tarkista env-muuttujat.' })
  }

  const { title, artist, summary, url, year, dates, tasks, createdBy } = req.body || {}

  // --- Validointi ---
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Tapahtumalle tarvitaan nimi' })
  }
  if (!dates || !Array.isArray(dates) || dates.length === 0) {
    return res.status(400).json({ error: 'Vähintään yksi päivämäärä tarvitaan' })
  }
  if (!year) {
    return res.status(400).json({ error: 'Vuosi tarvitaan' })
  }

  try {
    // Käytä atomista RPC-funktiota - joko kaikki onnistuu tai mikään ei tallennu
    const { data, error } = await supabaseAdmin.rpc('create_event_atomic', {
      p_title: title.trim(),
      p_artist: artist || null,
      p_summary: summary || null,
      p_url: url || null,
      p_year: year,
      p_dates: JSON.stringify(dates),
      p_tasks: tasks && tasks.length > 0 ? JSON.stringify(tasks) : null,
      p_created_by_id: createdBy?.id || null,
      p_created_by_email: createdBy?.email || null,
      p_created_by_name: createdBy?.name || null,
    })

    if (error) {
      console.error('[POST /api/events] RPC error:', error)

      // Tarkista onko funktio olemassa - jos ei, käytä fallback-metodia
      if (error.message && error.message.includes('function create_event_atomic')) {
        console.log('[POST /api/events] RPC-funktio puuttuu, käytetään fallback-metodia')
        return await fallbackInsert(req, res, { title, artist, summary, url, year, dates, tasks, createdBy })
      }

      return res.status(500).json({
        error: 'Tapahtumaa ei voitu tallentaa',
        details: error.message,
        code: error.code,
        hint: error.hint
      })
    }

    return res.status(201).json({ success: true, event: data })

  } catch (err) {
    console.error('[POST /api/events] Exception:', err)
    return res.status(500).json({
      error: 'Odottamaton virhe',
      details: err.message
    })
  }
}
