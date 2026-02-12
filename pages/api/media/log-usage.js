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

    const { mediaAssetId, usageType, usageContext } = req.body

    if (!mediaAssetId || !usageType) {
      return res.status(400).json({ error: 'mediaAssetId ja usageType vaaditaan' })
    }

    // Kirjaa käyttöhistoriaan
    const { error: logError } = await supabaseAdmin
      .from('media_usage_log')
      .insert({
        media_asset_id: mediaAssetId,
        usage_type: usageType,
        usage_context: (usageContext || '').substring(0, 500)
      })

    if (logError) {
      console.error('Log usage error:', logError)
      return res.status(500).json({ error: 'Käyttöhistorian kirjaus epäonnistui' })
    }

    // Päivitä käyttölaskuri ja viimeisin käyttöaika
    const { data: asset } = await supabaseAdmin
      .from('media_assets')
      .select('use_count')
      .eq('id', mediaAssetId)
      .single()

    if (asset) {
      await supabaseAdmin
        .from('media_assets')
        .update({
          use_count: (asset.use_count || 0) + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', mediaAssetId)
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Log-usage error:', error)
    return res.status(500).json({ error: error.message })
  }
}

export default cors(handler)
