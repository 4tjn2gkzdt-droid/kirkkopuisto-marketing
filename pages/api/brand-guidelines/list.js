/**
 * API endpoint: Hae kaikki brändiohjedokumentit
 */

import { supabaseAdmin } from '../../../lib/supabase-admin'
import { loadBrandGuidelines } from '../../../lib/api/brandGuidelineService'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('[list] ==========================================')
  console.log('[list] Haetaan aktiiviset dokumentit')

  try {
    // Tarkista autentikointi
    const authHeader = req.headers.authorization
    if (!authHeader) {
      console.log('[list] ❌ Authorization header puuttuu')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')

    // Tarkista käyttäjä Supabasesta
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.log('[list] ❌ Auth error:', authError)
      return res.status(401).json({ error: 'Unauthorized' })
    }

    console.log(`[list] ✅ Käyttäjä: ${user.email}`)

    // Hae dokumentit
    const guidelines = await loadBrandGuidelines()

    console.log(`[list] ✅ Löytyi ${guidelines?.length || 0} dokumenttia`)
    guidelines?.forEach((doc, i) => {
      console.log(`[list]   ${i + 1}. ${doc.title} (status: ${doc.status})`)
    })
    console.log('[list] ==========================================')

    return res.status(200).json({
      success: true,
      guidelines
    })

  } catch (error) {
    console.error('[list] ❌ Error:', error)
    console.log('[list] ==========================================')
    return res.status(500).json({
      error: 'Dokumenttien haku epäonnistui',
      details: error.message
    })
  }
}
