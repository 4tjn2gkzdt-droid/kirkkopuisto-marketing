/**
 * API endpoint: Testaa tiedoston lataamista ja lukemista
 */

import { supabaseAdmin } from '../../../lib/supabase-admin'
import { downloadAndReadFile } from '../../../lib/api/brandGuidelineService'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  console.log('[test-download] ==========================================')
  console.log('[test-download] Aloitetaan tiedoston lataus ja luku')

  try {
    // Tarkista autentikointi
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')

    // Tarkista käyttäjä
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    console.log(`[test-download] ✅ Käyttäjä: ${user.email}`)

    // Hae filePath requestista
    const { filePath } = req.body

    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'filePath puuttuu',
        details: 'Anna filePath request bodyssä'
      })
    }

    console.log(`[test-download] Ladataan tiedostoa: ${filePath}`)

    // Lataa ja lue tiedosto
    const content = await downloadAndReadFile(filePath)

    console.log(`[test-download] ✅ Tiedosto ladattu ja luettu!`)
    console.log(`[test-download] Sisällön pituus: ${content.length} merkkiä`)
    console.log(`[test-download] Ensimmäiset 100 merkkiä: ${content.substring(0, 100)}...`)
    console.log('[test-download] ==========================================')

    return res.status(200).json({
      success: true,
      message: 'Tiedosto ladattu ja luettu onnistuneesti',
      filePath,
      contentLength: content.length,
      contentPreview: content.substring(0, 500), // Ensimmäiset 500 merkkiä
      fileType: filePath.toLowerCase().endsWith('.pdf') ? 'PDF' :
                filePath.toLowerCase().endsWith('.md') ? 'Markdown' :
                filePath.toLowerCase().endsWith('.json') ? 'JSON' : 'Unknown'
    })

  } catch (error) {
    console.error('[test-download] ❌❌❌ Kriittinen virhe:', error)
    console.log('[test-download] ==========================================')
    return res.status(500).json({
      success: false,
      error: 'Tiedoston lataus epäonnistui',
      details: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    })
  }
}
