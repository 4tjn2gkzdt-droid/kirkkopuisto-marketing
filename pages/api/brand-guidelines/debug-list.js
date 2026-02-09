/**
 * DEBUG API endpoint: Hae KAIKKI brändiohjedokumentit (myös poistetut)
 * Käytä vain debuggaukseen!
 */

import { supabaseAdmin } from '../../../lib/supabase-admin'

export default async function handler(req, res) {
  // Salli debug-reitit vain development-ympäristössä
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' })
  }

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

    console.log('[debug-list] ==========================================')
    console.log('[debug-list] Haetaan KAIKKI dokumentit (myös poistetut)')

    // Hae KAIKKI dokumentit (ei is_active filtteriä)
    const { data, error } = await supabaseAdmin
      .from('brand_guidelines')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[debug-list] Error:', error)
      return res.status(500).json({
        success: false,
        error: 'Dokumenttien haku epäonnistui',
        details: error.message
      })
    }

    console.log(`[debug-list] Löytyi ${data?.length || 0} dokumenttia`)
    data?.forEach((doc, i) => {
      console.log(`[debug-list]   ${i + 1}. ${doc.title} (is_active: ${doc.is_active}, status: ${doc.status})`)
    })
    console.log('[debug-list] ==========================================')

    return res.status(200).json({
      success: true,
      count: data?.length || 0,
      guidelines: data || []
    })

  } catch (error) {
    console.error('[debug-list] Exception:', error)
    return res.status(500).json({
      success: false,
      error: 'Dokumenttien haku epäonnistui',
      details: error.message
    })
  }
}
