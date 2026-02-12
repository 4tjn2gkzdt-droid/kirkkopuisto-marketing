import { supabaseAdmin } from '../../../lib/supabase-admin'
import cors from '../../../lib/cors'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase ei ole konfiguroitu' })
    }

    const { files } = req.body

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Tiedostot puuttuvat' })
    }

    // Luo media_assets rivit tietokantaan
    const rows = files.map(file => ({
      storage_path: file.storagePath,
      public_url: file.publicUrl,
      file_name: file.fileName,
      file_type: file.fileType || 'image',
      file_size: file.fileSize || null,
      ai_analyzed: false
    }))

    const { data, error } = await supabaseAdmin
      .from('media_assets')
      .insert(rows)
      .select()

    if (error) {
      console.error('Media assets insert error:', error)
      return res.status(500).json({ error: 'Tietokantavirhe', details: error.message })
    }

    return res.status(200).json({ success: true, assets: data })
  } catch (error) {
    console.error('Upload handler error:', error)
    return res.status(500).json({ error: error.message })
  }
}

export default cors(handler)
