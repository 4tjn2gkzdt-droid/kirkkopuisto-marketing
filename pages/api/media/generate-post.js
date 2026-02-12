import { supabaseAdmin } from '../../../lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'
import cors from '../../../lib/cors'

const SYSTEM_PROMPT = `Olet Kirkkopuiston Terassin somevastaava. Sinulle annetaan kuva ravintolan kuvapankista.
Luo 2-3 erilaista somepostausehdotusta kuvan perusteella.

Ehdotukset ovat erilaisia tyyliltään:
1. Informatiivinen/asiallinen
2. Rento/hauska
3. Tunnelmallinen/houkutteleva

Jokainen ehdotus sisältää:
- Postauksen teksti (sopivan pituinen valitulle alustalle)
- 3-5 relevanttia hashtagia
- Ehdotus parhaasta julkaisuajankohdasta

Platform-ohjeet:
- Instagram: visuaalinen, emojit ok, max 2200 merkkiä, hashtagit erilliseen kappaleeseen
- Facebook: voi olla pidempi, keskustelevampi, linkki ok
- Yleinen: neutraali, toimii missä vain

Kirjoita suomeksi. Kirkkopuiston Terassi on ravintola/terassi Turussa joka on tunnettu
livemusiikista, tapahtumista, hyvästä ruoasta ja rennosta tunnelmasta.

Palauta VAIN JSON-taulukko tässä muodossa:
[
  {
    "style": "Informatiivinen",
    "text": "Postauksen teksti...",
    "hashtags": "#kirkkopuisto #turku #terassi",
    "best_time": "Tiistai klo 18"
  }
]`

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase ei ole konfiguroitu' })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY puuttuu' })
    }

    const { mediaAssetId, platform = 'instagram', context = '' } = req.body

    if (!mediaAssetId) {
      return res.status(400).json({ error: 'mediaAssetId puuttuu' })
    }

    // Hae kuvan tiedot
    const { data: asset, error: fetchError } = await supabaseAdmin
      .from('media_assets')
      .select('*')
      .eq('id', mediaAssetId)
      .single()

    if (fetchError || !asset) {
      return res.status(404).json({ error: 'Kuvaa ei löytynyt' })
    }

    // Kokoa konteksti kuvan metatiedoista
    let imageContext = ''
    if (asset.description_fi) imageContext += `Kuvan kuvaus: ${asset.description_fi}\n`
    if (asset.tags && asset.tags.length > 0) imageContext += `Tagit: ${asset.tags.join(', ')}\n`
    if (asset.mood) imageContext += `Tunnelma: ${asset.mood}\n`
    if (asset.season) imageContext += `Kausi: ${asset.season}\n`
    if (asset.content_type) imageContext += `Sisältötyyppi: ${asset.content_type}\n`
    if (context) imageContext += `\nKäyttäjän lisäkonteksti: ${context}\n`

    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: asset.public_url }
          },
          {
            type: 'text',
            text: `${SYSTEM_PROMPT}\n\nAlusta: ${platform}\n\n${imageContext}\n\nLuo ehdotukset.`
          }
        ]
      }]
    })

    const textContent = response.content.find(block => block.type === 'text')
    let contentText = textContent?.text || '[]'
    contentText = contentText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let suggestions
    try {
      suggestions = JSON.parse(contentText)
    } catch {
      console.error('Parsintavirhe:', contentText)
      return res.status(500).json({ error: 'AI-vastauksen parsinta epäonnistui' })
    }

    // Kirjaa käyttöhistoriaan
    await supabaseAdmin
      .from('media_usage_log')
      .insert({
        media_asset_id: mediaAssetId,
        usage_type: 'idea',
        usage_context: `${platform}: ${context || 'Somepäivitysehdotus'}`
      })

    // Päivitä käyttölaskuri
    await supabaseAdmin
      .from('media_assets')
      .update({
        use_count: (asset.use_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', mediaAssetId)

    return res.status(200).json({
      success: true,
      suggestions,
      usage: response.usage
    })
  } catch (error) {
    console.error('Generate-post error:', error)
    return res.status(500).json({ error: error.message })
  }
}

export default cors(handler)
