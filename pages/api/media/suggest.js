import { supabaseAdmin } from '../../../lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'
import cors from '../../../lib/cors'

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

    const { text } = req.body

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Teksti puuttuu' })
    }

    // Käytä Claudea parsimaan relevantteja hakutermejä
    const anthropic = new Anthropic({ apiKey })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Analysoi tämä markkinointiteksti ja palauta JSON-muodossa relevantteja hakutermejä kuvapankkia varten.

Teksti: "${text}"

Palauta VAIN JSON tässä muodossa:
{
  "tags": ["tagi1", "tagi2"],
  "mood": "energinen | rauhallinen | juhlava | arkinen | tunnelmallinen | rento | null",
  "content_type": "ruoka | juoma | tapahtuma | miljöö | ihmiset | livemusiikki | muu | null",
  "season": "kevät | alkukesä | loppukesä | keskikesä | yleinen | null"
}

Käytä suomenkielisiä termejä. Palauta vain relevantteja kenttiä.`
      }]
    })

    const textContent = response.content.find(block => block.type === 'text')
    let contentText = textContent?.text || '{}'
    contentText = contentText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let searchTerms
    try {
      searchTerms = JSON.parse(contentText)
    } catch {
      searchTerms = { tags: [], mood: null, content_type: null, season: null }
    }

    // Hae kuvat Supabasesta eri kriteereillä
    let query = supabaseAdmin
      .from('media_assets')
      .select('*')
      .eq('ai_analyzed', true)
      .eq('file_type', 'image')

    // Lisää filtterit jos saatavilla
    if (searchTerms.mood && searchTerms.mood !== 'null') {
      query = query.eq('mood', searchTerms.mood)
    }
    if (searchTerms.content_type && searchTerms.content_type !== 'null') {
      query = query.eq('content_type', searchTerms.content_type)
    }

    const { data: filteredAssets, error: filterError } = await query
      .order('created_at', { ascending: false })
      .limit(20)

    if (filterError) {
      return res.status(500).json({ error: 'Hakuvirhe', details: filterError.message })
    }

    // Pisteytä tulokset tagien osumien perusteella
    const searchTags = searchTerms.tags || []
    const scored = (filteredAssets || []).map(asset => {
      const assetTags = asset.tags || []
      const tagMatches = searchTags.filter(tag =>
        assetTags.some(at => at.toLowerCase().includes(tag.toLowerCase()) || tag.toLowerCase().includes(at.toLowerCase()))
      ).length
      const descMatch = searchTags.some(tag =>
        (asset.description_fi || '').toLowerCase().includes(tag.toLowerCase())
      ) ? 1 : 0
      return { ...asset, score: tagMatches * 2 + descMatch }
    })

    // Järjestä pisteiden mukaan ja palauta top 6
    scored.sort((a, b) => b.score - a.score)
    const suggestions = scored.slice(0, 6)

    // Jos liian vähän tuloksia, hae lisää ilman filttereitä
    if (suggestions.length < 3) {
      const { data: fallback } = await supabaseAdmin
        .from('media_assets')
        .select('*')
        .eq('ai_analyzed', true)
        .eq('file_type', 'image')
        .order('created_at', { ascending: false })
        .limit(6)

      if (fallback) {
        const existingIds = new Set(suggestions.map(s => s.id))
        for (const fb of fallback) {
          if (!existingIds.has(fb.id) && suggestions.length < 6) {
            suggestions.push({ ...fb, score: 0 })
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      suggestions,
      searchTerms
    })
  } catch (error) {
    console.error('Suggest error:', error)
    return res.status(500).json({ error: error.message })
  }
}

export default cors(handler)
