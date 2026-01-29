/**
 * API endpoint: Poista brändiohjedokumentti
 */

import { supabaseAdmin } from '../../../lib/supabase-admin'
import { deleteBrandGuideline } from '../../../lib/api/brandGuidelineService'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
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

    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'Missing id parameter' })
    }

    // Poista dokumentti
    await deleteBrandGuideline(id)

    return res.status(200).json({
      success: true,
      message: 'Dokumentti poistettu onnistuneesti'
    })

  } catch (error) {
    console.error('[delete] Error:', error)
    return res.status(500).json({
      error: 'Dokumentin poisto epäonnistui',
      details: error.message
    })
  }
}
