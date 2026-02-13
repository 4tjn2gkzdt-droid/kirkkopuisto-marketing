import Anthropic from '@anthropic-ai/sdk'
import cors from '../../lib/cors'
import { BRAND_VOICE_PROMPT } from '../../lib/brand-voice'

// Increase timeout for this API route
export const config = {
  maxDuration: 30,
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { suggestion } = req.body

  if (!suggestion) {
    return res.status(400).json({ error: 'Suggestion data is required' })
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return res.status(500).json({
        error: 'API-avain puuttuu',
        message: 'Anthropic API-avain ei ole konfiguroitu'
      })
    }

    const anthropic = new Anthropic({ apiKey })

    // Luo prompt caption-sisällön generointiin
    const prompt = `Luo somepostauksen sisältö seuraavalle ehdotukselle:

PÄIVÄMÄÄRÄ: ${suggestion.date}
TYYPPI: ${suggestion.type}
KANAVA: ${suggestion.channel}
OTSIKKO: ${suggestion.title}
PERUSTELU: ${suggestion.reason}

Luo KOLME eri pituista caption-versiota tälle postaukselle:
- short: Lyhyt, napakka versio (1-2 lausetta)
- medium: Keskipitkä versio (2-4 lausetta)
- long: Pitkä, yksityiskohtainen versio (5-8 lausetta)

Vastaa JSON-muodossa:
{
  "captions": {
    "short": "Lyhyt caption-teksti tähän",
    "medium": "Keskipitkä caption-teksti tähän",
    "long": "Pitkä caption-teksti tähän"
  }
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: `${BRAND_VOICE_PROMPT}

Olet sisältöstrategisti Kirkkopuiston Terassille. Luot houkuttelevia somepostauksia brändiäänen mukaisesti.
Vastaa AINA JSON-muodossa.`
    })

    const textContent = response.content.find(block => block.type === 'text')
    let contentText = textContent?.text || '{}'

    // Poista markdown-koodiblokki-merkinnät
    contentText = contentText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    // Etsi JSON-objekti
    const jsonMatch = contentText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      contentText = jsonMatch[0]
    }

    let parsed
    try {
      parsed = JSON.parse(contentText)
    } catch (parseError) {
      console.error('JSON parse failed:', parseError)
      console.error('Attempted to parse:', contentText)
      throw new Error('AI palautti virheellisen JSON-muodon: ' + parseError.message)
    }

    const captions = parsed.captions || {}

    if (!captions.short || !captions.medium || !captions.long) {
      throw new Error('AI ei palauttanut kaikkia caption-versioita')
    }

    res.status(200).json({
      success: true,
      captions
    })

  } catch (error) {
    console.error('Generate post content error:', error)
    res.status(500).json({
      error: error.message,
      details: error.toString()
    })
  }
}

export default cors(handler)
