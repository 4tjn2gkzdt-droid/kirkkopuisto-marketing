import { supabase } from '../../lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import cors from '../../lib/cors'

// Increase timeout for this API route to 60 seconds
export const config = {
  maxDuration: 60, // Vercel Pro: 60s, Hobby: 10s (will use max available)
}

// Apufunktio: Parsii YYYY-MM-DD stringin paikalliseksi Date-objektiksi (ei UTC)
function parseLocalDate(dateString) {
  if (!dateString) return new Date()
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Apufunktio: Muuntaa Date-objektin YYYY-MM-DD stringiksi paikallisessa ajassa
function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function handler(req, res) {
  // Ensure we always return JSON
  res.setHeader('Content-Type', 'application/json')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { startDate, endDate } = req.body
  const debugInfo = {
    steps: [],
    errors: [],
    warnings: []
  }

  try {
    debugInfo.steps.push({
      step: 0,
      name: 'Request received',
      data: {
        method: req.method,
        body: req.body,
        headers: {
          contentType: req.headers['content-type'],
          userAgent: req.headers['user-agent']
        }
      }
    })
    debugInfo.steps.push({
      step: 1,
      name: 'Parsing dates',
      input: { startDate, endDate }
    })

    const start = startDate ? parseLocalDate(startDate) : new Date()
    const end = endDate ? parseLocalDate(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    debugInfo.steps.push({
      step: 2,
      name: 'Parsed dates',
      data: { start: start.toISOString(), end: end.toISOString() }
    })

    // Hae tapahtumat
    debugInfo.steps.push({ step: 3, name: 'Fetching events from database' })
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*, tasks (*)')
      .gte('date', formatLocalDate(start))
      .lte('date', formatLocalDate(end))
      .order('date', { ascending: true })

    if (eventsError) {
      debugInfo.errors.push({ location: 'events fetch', error: eventsError })
      throw eventsError
    }

    debugInfo.steps.push({
      step: 4,
      name: 'Events fetched',
      data: { count: events.length, events: events.map(e => ({ id: e.id, title: e.title, date: e.date })) }
    })

    // Hae somepostaukset
    debugInfo.steps.push({ step: 5, name: 'Fetching social posts from database' })
    const { data: socialPosts, error: socialError } = await supabase
      .from('social_media_posts')
      .select('*')
      .gte('date', formatLocalDate(start))
      .lte('date', formatLocalDate(end))
      .order('date', { ascending: true })

    if (socialError) {
      debugInfo.errors.push({ location: 'social posts fetch', error: socialError })
      throw socialError
    }

    debugInfo.steps.push({
      step: 6,
      name: 'Social posts fetched',
      data: { count: socialPosts.length, posts: socialPosts.map(p => ({ id: p.id, title: p.title, date: p.date })) }
    })

    // Check API key
    debugInfo.steps.push({ step: 7, name: 'Checking API key' })
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      debugInfo.warnings.push('ANTHROPIC_API_KEY not found in environment')
      return res.status(200).json({
        success: false,
        message: 'API key missing',
        debugInfo
      })
    }

    debugInfo.steps.push({ step: 8, name: 'API key found', data: { keyLength: apiKey.length, keyPrefix: apiKey.substring(0, 10) + '...' } })

    // Luo yhteenveto tilanteesta AI:lle
    const summary = `SISÄLTÖKALENTERIN ANALYYSI (${start.toLocaleDateString('fi-FI')} - ${end.toLocaleDateString('fi-FI')}):

TAPAHTUMAT (${events.length} kpl):
${events.map(e => `- ${new Date(e.date).toLocaleDateString('fi-FI')}: ${e.title}${e.artist ? ` (${e.artist})` : ''}`).join('\n')}

SOMEPOSTAUKSET (${socialPosts.length} kpl):
${socialPosts.map(p => `- ${new Date(p.date).toLocaleDateString('fi-FI')}: ${p.title} (${p.type}, status: ${p.status})`).join('\n')}

ANNA 5-8 KONKREETTISTA SISÄLTÖEHDOTUSTA:
- Milloin julkaista
- Mitä julkaista
- Mihin kanavaan
- Miksi juuri nyt
- Luo KOLME eri pituista caption-versiota jokaiselle ehdotukselle:
  * short: Lyhyt, napakka versio (1-2 lausetta)
  * medium: Keskipitkä versio (2-4 lausetta)
  * long: Pitkä, yksityiskohtainen versio (5-8 lausetta)

Muotoile JSON:
{
  "suggestions": [
    {
      "date": "2024-01-15",
      "type": "Viikko-ohjelma",
      "channel": "Instagram",
      "reason": "Maanantai-aamuna viikon avaus",
      "priority": "high/medium/low",
      "captions": {
        "short": "Lyhyt caption-teksti tähän",
        "medium": "Keskipitkä caption-teksti tähän",
        "long": "Pitkä caption-teksti tähän"
      }
    }
  ]
}`

    debugInfo.steps.push({
      step: 9,
      name: 'AI prompt created',
      data: { promptLength: summary.length, promptPreview: summary.substring(0, 200) + '...' }
    })

    debugInfo.steps.push({ step: 10, name: 'Calling Anthropic API' })

    const anthropic = new Anthropic({ apiKey })

    let aiResponse
    try {
      aiResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048, // Reduced from 4096 to speed up response
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: summary
        }],
        system: `Olet sisältöstrategisti Kirkkopuiston Terassille.
Analysoit sisältökalenteria ja ehdotat sisältöä.
Vastaa AINA JSON-muodossa.`
      })

      debugInfo.steps.push({
        step: 11,
        name: 'AI response received',
        data: {
          id: aiResponse.id,
          model: aiResponse.model,
          stop_reason: aiResponse.stop_reason,
          usage: aiResponse.usage
        }
      })
    } catch (apiError) {
      debugInfo.errors.push({
        location: 'Anthropic API call',
        error: {
          message: apiError.message,
          status: apiError.status,
          type: apiError.type,
          stack: apiError.stack
        }
      })
      throw apiError
    }

    const textContent = aiResponse.content.find(block => block.type === 'text')
    const rawText = textContent?.text || '{}'

    debugInfo.steps.push({
      step: 12,
      name: 'Extracted text content',
      data: {
        rawTextLength: rawText.length,
        rawTextFull: rawText, // Koko vastaus näkyviin
        rawTextPreview: rawText.substring(0, 500)
      }
    })

    let contentText = rawText

    // Poista markdown-koodiblokki-merkinnät
    debugInfo.steps.push({ step: 13, name: 'Cleaning markdown' })
    contentText = contentText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    debugInfo.steps.push({
      step: 14,
      name: 'After markdown cleanup',
      data: { cleanedTextLength: contentText.length, cleanedTextPreview: contentText.substring(0, 500) }
    })

    // Etsi JSON-objekti
    debugInfo.steps.push({ step: 15, name: 'Searching for JSON object' })
    const jsonMatch = contentText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      contentText = jsonMatch[0]
      debugInfo.steps.push({
        step: 16,
        name: 'JSON object found',
        data: { jsonLength: contentText.length, jsonPreview: contentText.substring(0, 500) }
      })
    } else {
      debugInfo.warnings.push('No JSON object pattern found in text')
      debugInfo.steps.push({
        step: 16,
        name: 'No JSON object found, using full text',
        data: { textLength: contentText.length }
      })
    }

    // Parse JSON
    debugInfo.steps.push({ step: 17, name: 'Parsing JSON' })
    let parsed
    try {
      parsed = JSON.parse(contentText)
      debugInfo.steps.push({
        step: 18,
        name: 'JSON parsed successfully',
        data: {
          parsedObject: parsed,
          suggestionsCount: parsed.suggestions?.length || 0
        }
      })
    } catch (parseError) {
      debugInfo.errors.push({
        location: 'JSON parse',
        error: {
          message: parseError.message,
          name: parseError.name,
          stack: parseError.stack
        },
        attemptedToParse: contentText
      })
      throw new Error('JSON parsing failed: ' + parseError.message)
    }

    const aiSuggestions = parsed.suggestions || []

    debugInfo.steps.push({
      step: 19,
      name: 'Final result',
      data: {
        suggestionsCount: aiSuggestions.length,
        suggestions: aiSuggestions
      }
    })

    res.status(200).json({
      success: true,
      aiSuggestions,
      debugInfo,
      message: `Successfully generated ${aiSuggestions.length} suggestions`
    })

  } catch (error) {
    debugInfo.errors.push({
      location: 'main handler',
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
        toString: error.toString()
      }
    })

    res.status(500).json({
      success: false,
      error: error.message,
      debugInfo
    })
  }
}

export default cors(handler)
