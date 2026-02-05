/**
 * API endpoint: Prosessoi brändiohjedokumentti (lue PDF ja luo tiivistelmä)
 */

import { supabaseAdmin } from '../../../lib/supabase-admin'
import { processBrandGuideline } from '../../../lib/api/brandGuidelineService'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    // Tarkista että käyttäjä on admin
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.is_admin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' })
    }

    const { id } = req.body

    if (!id) {
      return res.status(400).json({ error: 'Missing id parameter' })
    }

    // Prosessoi dokumentti
    const result = await processBrandGuideline(id)

    return res.status(200).json({
      success: true,
      message: 'Dokumentti prosessoitu onnistuneesti',
      summary: result.summary
    })

  } catch (error) {
    console.error('[process] Error:', error)
    return res.status(500).json({
      error: 'Dokumentin prosessointi epäonnistui',
      details: error.message
    })
  }
}
