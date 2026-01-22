/**
 * API endpoint: Lataa brändiohjedokumentti
 */

import { supabaseAdmin } from '../../../lib/supabase-admin'
import {
  uploadToStorage,
  createBrandGuideline,
  processBrandGuideline
} from '../../../lib/api/brandGuidelineService'

// Konfiguraatio: Salli suuret tiedostot
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
}

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

    // Odotetaan että frontend lähettää JSON-datan
    const { title, fileData, fileName, contentType } = req.body

    if (!title || !fileData || !fileName) {
      return res.status(400).json({
        error: 'Missing required fields: title, fileData, fileName'
      })
    }

    // Dekoodaa base64 fileData -> Buffer
    const base64Data = fileData.split(',')[1] || fileData
    const fileBuffer = Buffer.from(base64Data, 'base64')

    // Lataa tiedosto Supabase Storageen
    const { filePath, fileUrl } = await uploadToStorage(
      fileBuffer,
      fileName,
      contentType || 'application/pdf'
    )

    // Luo tietokantaan entry
    const guideline = await createBrandGuideline({
      title,
      fileName,
      fileUrl,
      filePath,
      userId: user.id,
      userEmail: user.email
    })

    // Prosessoi dokumentti taustalla (älä odota)
    processBrandGuideline(guideline.id)
      .then(() => {
        console.log(`[upload] Successfully processed guideline: ${guideline.id}`)
      })
      .catch(err => {
        console.error(`[upload] Error processing guideline: ${guideline.id}`, err)
      })

    return res.status(200).json({
      success: true,
      guideline,
      message: 'Dokumentti ladattu onnistuneesti. Käsittely käynnissä taustalla.'
    })

  } catch (error) {
    console.error('[upload] Error:', error)
    return res.status(500).json({
      error: 'Dokumentin lataus epäonnistui',
      details: error.message
    })
  }
}
