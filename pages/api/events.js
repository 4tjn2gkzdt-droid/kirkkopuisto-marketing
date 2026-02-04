/**
 * POST /api/events
 *
 * Luo uuden tapahtuman + päivämäärät + tehtävät ykseä server-side kyselyä kohti.
 * Käyttää supabaseAdmin (service_role) → ei token-refresh -ongelmia, nopea yhteys.
 * Epäonnistuessaan rollback: poistetaan luodut rivit.
 */
import { supabaseAdmin } from '../../lib/supabase-admin'

// Käsittele puuttuvat sarakkeet automaattisesti (migraatioita ei ole ajettu).
// Palauttaa { data, error } kuten supabase-kutsu normaalisti.
async function insertWithFallback(client, table, payload, single = false) {
  let current = payload
  for (let i = 0; i < 4; i++) {
    const query = client.from(table).insert(current)
    const result = single ? await query.select().single() : await query
    if (!result.error) return result

    const msg = result.error.message || ''
    if (msg.includes('does not exist')) {
      const match = msg.match(/column "(\w+)"/)
      if (match) {
        const col = match[1]
        console.warn(`[events] sarake "${col}" puuttee "${table}" – poistetaan ja yritetään`)
        current = Array.isArray(current)
          ? current.map(row => { const { [col]: _, ...rest } = row; return rest })
          : (() => { const { [col]: _, ...rest } = current; return rest })()
        continue
      }
    }
    return result // muu virhe – palautetaan sellaisenaan
  }
  return { data: null, error: { message: `Liikaa puuttuvia sarakkeita taulusta ${table}` } }
}

export const config = {
  api: {
    maxDuration: 10,
  },
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

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

  let createdEventId = null

  try {
    // --- Vaihe 1: master-tapahtuma ---
    const eventPayload = {
      title: title.trim(),
      artist: artist || null,
      summary: summary || null,
      url: url || null,
      year,
      images: {},
      created_by_id: createdBy?.id || null,
      created_by_email: createdBy?.email || null,
      created_by_name: createdBy?.name || null,
    }

    const { data: savedEvent, error: eventError } = await insertWithFallback(
      supabaseAdmin, 'events', eventPayload, true
    )
    if (eventError) {
      return res.status(500).json({ error: 'Tapahtumaa ei voitu tallentaa', details: eventError.message })
    }
    createdEventId = savedEvent.id

    // --- Vaihe 2: päivämäärät (event_instances) ---
    const instances = dates.map(d => ({
      event_id: savedEvent.id,
      date: d.date,
      start_time: d.startTime || null,
      end_time: d.endTime || null,
    }))

    const { error: instancesError } = await supabaseAdmin
      .from('event_instances')
      .insert(instances)

    if (instancesError) {
      await supabaseAdmin.from('events').delete().eq('id', savedEvent.id)
      return res.status(500).json({ error: 'Päivämääriä ei voitu tallentaa', details: instancesError.message })
    }

    // --- Vaihe 3: tehtävät ---
    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      const tasksPayload = tasks.map(task => ({
        event_id: savedEvent.id,
        title: task.title,
        channel: task.channel,
        due_date: task.dueDate,
        due_time: task.dueTime || null,
        completed: false,
        content: task.content || null,
        assignee: task.assignee || null,
        notes: task.notes || null,
        created_by_id: createdBy?.id || null,
        created_by_email: createdBy?.email || null,
        created_by_name: createdBy?.name || null,
      }))

      const { error: tasksError } = await insertWithFallback(supabaseAdmin, 'tasks', tasksPayload)
      if (tasksError) {
        // Rollback: poista instances + event
        await supabaseAdmin.from('event_instances').delete().eq('event_id', savedEvent.id)
        await supabaseAdmin.from('events').delete().eq('id', savedEvent.id)
        return res.status(500).json({ error: 'Tehtäviä ei voitu tallentaa', details: tasksError.message })
      }
    }

    // --- Hae lutettu tapahtuma ---
    const { data: createdEvent } = await supabaseAdmin
      .from('events')
      .select('*, event_instances(*), tasks(*)')
      .eq('id', savedEvent.id)
      .single()

    return res.status(201).json({ success: true, event: createdEvent })

  } catch (err) {
    console.error('[POST /api/events]', err)
    // Cleanup partial inserts
    if (createdEventId) {
      try {
        await supabaseAdmin.from('tasks').delete().eq('event_id', createdEventId)
        await supabaseAdmin.from('event_instances').delete().eq('event_id', createdEventId)
        await supabaseAdmin.from('events').delete().eq('id', createdEventId)
      } catch (_) { /* cleanup-virhe ei saa kaataa vastausta */ }
    }
    return res.status(500).json({ error: 'Odottamaton virhe', details: err.message })
  }
}
