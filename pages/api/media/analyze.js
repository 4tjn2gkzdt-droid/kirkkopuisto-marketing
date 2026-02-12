import { supabaseAdmin } from '../../../lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'
import cors from '../../../lib/cors'

const SYSTEM_PROMPT = `Olet kuvien analysointityökalu Kirkkopuiston Terassi -ravintolan markkinointisovelluksessa.
Analysoi kuva ja palauta JSON-vastaus seuraavassa muodossa:

{
  "description_fi": "Lyhyt kuvaus suomeksi, 1-2 lausetta",
  "description_en": "Short description in English, 1-2 sentences",
  "tags": ["tagi1", "tagi2", "tagi3"],
  "mood": "yksi näistä: energinen | rauhallinen | juhlava | arkinen | tunnelmallinen | rento",
  "season": "yksi näistä: kevät | alkukesä | loppukesä | keskikesä | yleinen",
  "content_type": "yksi näistä: ruoka | juoma | tapahtuma | miljöö | ihmiset | livemusiikki | muu",
  "colors": ["pääväri1", "pääväri2"]
}

Konteksti: Kirkkopuiston Terassi on ravintola/terassi joka järjestää tapahtumia,
livemusiikkia ja tarjoilee ruokaa ja juomia. Tagita kuva tämän kontekstin perusteella.
Käytä suomenkielisiä tageja. Generoi 3-8 relevanttia tagia per kuva.
Palauta VAIN JSON, ei muuta tekstiä.`

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

    const { assetId } = req.body

    if (!assetId) {
      return res.status(400).json({ error: 'assetId puuttuu' })
    }

    // Hae media asset
    const { data: asset, error: fetchError } = await supabaseAdmin
      .from('media_assets')
      .select('*')
      .eq('id', assetId)
      .single()

    if (fetchError || !asset) {
      return res.status(404).json({ error: 'Mediatiedostoa ei löytynyt' })
    }

    // Lähetä kuva Clauden Vision API:lle
    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'url',
              url: asset.public_url
            }
          },
          {
            type: 'text',
            text: SYSTEM_PROMPT
          }
        ]
      }]
    })

    const textContent = response.content.find(block => block.type === 'text')
    let contentText = textContent?.text || '{}'
    contentText = contentText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let analysis
    try {
      analysis = JSON.parse(contentText)
    } catch (parseError) {
      console.error('AI-analyysin parsinta epäonnistui:', contentText)
      return res.status(500).json({ error: 'AI-vastauksen parsinta epäonnistui', raw: contentText })
    }

    // Päivitä tietokantaan
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('media_assets')
      .update({
        description_fi: analysis.description_fi || null,
        description_en: analysis.description_en || null,
        tags: analysis.tags || [],
        mood: analysis.mood || null,
        season: analysis.season || null,
        content_type: analysis.content_type || null,
        colors: analysis.colors || [],
        ai_analyzed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId)
      .select()
      .single()

    if (updateError) {
      console.error('Media asset update error:', updateError)
      return res.status(500).json({ error: 'Päivitysvirhe', details: updateError.message })
    }

    return res.status(200).json({
      success: true,
      asset: updated,
      usage: response.usage
    })
  } catch (error) {
    console.error('Analyze error:', error)
    return res.status(500).json({ error: error.message })
  }
}

export default cors(handler)
