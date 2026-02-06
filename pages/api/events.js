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
      return res.status(500).json({
        error: 'Tapahtumaa ei voitu tallentaa',
        details: error.message
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
