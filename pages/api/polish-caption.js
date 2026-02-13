import Anthropic from '@anthropic-ai/sdk'
import cors from '../../lib/cors'
import { BRAND_VOICE_PROMPT } from '../../lib/brand-voice'

// Increase timeout for this API route
export const config = {
  maxDuration: 30, // 30 seconds should be enough for caption polishing
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { caption } = req.body

  if (!caption || caption.trim().length === 0) {
    return res.status(400).json({ error: 'Caption is required' })
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' })
    }

    const anthropic = new Anthropic({ apiKey })

    const prompt = `Sinun tehtäväsi on viimeistellä somepostauksen teksti Kirkkopuiston Terassille.

ALKUPERÄINEN TEKSTI:
"${caption}"

Luo kolme eri versiota tästä tekstistä:

1. LYHYT versio (50-100 merkkiä): Napakka ja ytimekäs, sopii storeihin ja TikTokiin
2. KESKIPITKÄ versio (100-200 merkkiä): Tasapainoinen, sopii Instagram-feediin
3. PITKÄ versio (200-300 merkkiä): Kattava ja houkutteleva, sopii Facebookiin ja uutiskirjeeseen

OHJEET:
- Säilytä alkuperäisen tekstin tarkoitus ja viesti
- Käytä myönteistä, kutsuvaa sävyä
- Sisällytä tarvittaessa relevantteja emojeja luonnollisesti
- Älä käytä hashtag-merkkejä (#)
- Kirjoita suomeksi
- Tee tekstistä houkutteleva ja helppolukuinen

Palauta vastaus JSON-muodossa:
{
  "short": "lyhyt versio tähän",
  "medium": "keskipitkä versio tähän",
  "long": "pitkä versio tähän"
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: `${BRAND_VOICE_PROMPT}

Olet Kirkkopuiston Terassin somemarkkinoinnin asiantuntija. Viimeistelet somepostauksia brändiäänen mukaisesti. Vastaat aina JSON-muodossa.`
    })

    const textContent = response.content.find(block => block.type === 'text')
    let contentText = textContent?.text || '{}'

    console.log('AI response:', contentText.substring(0, 500)) // Debug log

    // Poista kaikki markdown-koodiblokki-merkinnät (```json, ```, etc.)
    contentText = contentText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    // Jos teksti alkaa tai päättyy välilyönneillä tai rivinvaihdoilla, puhdista
    contentText = contentText.trim()

    // Etsi JSON-objekti tekstistä (alkaa { ja päättyy })
    const jsonMatch = contentText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      contentText = jsonMatch[0]
    }

    let versions
    try {
      versions = JSON.parse(contentText)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('Raw response:', contentText)
      return res.status(500).json({
        error: 'AI palautti virheellisen JSON-muodon',
        details: contentText.substring(0, 200)
      })
    }

    res.status(200).json({
      success: true,
      versions: {
        short: versions.short || '',
        medium: versions.medium || '',
        long: versions.long || ''
      }
    })

  } catch (error) {
    console.error('Polish caption error:', error)
    res.status(500).json({
      error: error.message,
      details: error.toString()
    })
  }
}

export default cors(handler)
