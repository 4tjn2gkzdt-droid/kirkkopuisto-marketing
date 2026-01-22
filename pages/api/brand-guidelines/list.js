/**
 * API endpoint: Hae kaikki brändiohjedokumentit
 */

import { supabaseAdmin } from '../../../lib/supabase-admin'
import { loadBrandGuidelines } from '../../../lib/api/brandGuidelineService'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Tarkista autentikointi
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')

    // Tarkista käyttäjä Supabasesta
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Hae dokumentit
    const guidelines = await loadBrandGuidelines()

    return res.status(200).json({
      success: true,
      guidelines
    })

  } catch (error) {
    console.error('[list] Error:', error)
    return res.status(500).json({
      error: 'Dokumenttien haku epäonnistui',
      details: error.message
    })
  }
}
