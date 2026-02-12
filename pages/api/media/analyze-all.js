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
livemusiikkia ja tarjoilee ruokaa ja juomia. Käytä suomenkielisiä tageja. 3-8 tagia per kuva.
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

    // Hae analysoimattomat kuvat
    const { data: assets, error: fetchError } = await supabaseAdmin
      .from('media_assets')
      .select('*')
      .eq('ai_analyzed', false)
      .eq('file_type', 'image')
      .order('created_at', { ascending: true })
      .limit(20)

    if (fetchError) {
      return res.status(500).json({ error: 'Hakuvirhe', details: fetchError.message })
    }

    if (!assets || assets.length === 0) {
      return res.status(200).json({ success: true, message: 'Ei analysoitavia kuvia', analyzed: 0 })
    }

    const anthropic = new Anthropic({ apiKey })
    const results = []

    for (const asset of assets) {
      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'url', url: asset.public_url }
              },
              { type: 'text', text: SYSTEM_PROMPT }
            ]
          }]
        })

        const textContent = response.content.find(block => block.type === 'text')
        let contentText = textContent?.text || '{}'
        contentText = contentText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

        let analysis
        try {
          analysis = JSON.parse(contentText)
        } catch {
          results.push({ id: asset.id, success: false, error: 'Parsintavirhe' })
          continue
        }

        await supabaseAdmin
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
          .eq('id', asset.id)

        results.push({ id: asset.id, success: true, fileName: asset.file_name })

        // Rate limiting: 500ms viive pyyntöjen välillä
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (err) {
        console.error(`Analyysivirhe kuvalle ${asset.id}:`, err.message)
        results.push({ id: asset.id, success: false, error: err.message })
      }
    }

    const successCount = results.filter(r => r.success).length

    return res.status(200).json({
      success: true,
      analyzed: successCount,
      total: assets.length,
      results
    })
  } catch (error) {
    console.error('Analyze-all error:', error)
    return res.status(500).json({ error: error.message })
  }
}

export default cors(handler)
