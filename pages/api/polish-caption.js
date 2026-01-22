import { withCorsAndErrorHandling } from '../../lib/errorHandler'
import { createClaudeMessage } from '../../lib/api/claudeService'

export const config = {
  maxDuration: 30,
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { caption } = req.body

  if (!caption || caption.trim().length === 0) {
    return res.status(400).json({ error: 'Caption is required' })
  }

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

  const result = await createClaudeMessage({
    message: prompt,
    systemPrompt: 'Olet luova somemarkkinoinnin asiantuntija joka osaa kirjoittaa houkuttelevia ja tehokkaita somepostauksia. Vastaat aina JSON-muodossa.',
    maxTokens: 1500,
    temperature: 0.7
  })

  let contentText = result.response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

  const jsonMatch = contentText.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    contentText = jsonMatch[0]
  }

  let versions
  try {
    versions = JSON.parse(contentText)
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError)
    return res.status(500).json({
      error: 'AI palautti virheellisen JSON-muodon',
      details: contentText.substring(0, 200)
    })
  }

  return res.status(200).json({
    success: true,
    versions: {
      short: versions.short || '',
      medium: versions.medium || '',
      long: versions.long || ''
    }
  })
}

export default withCorsAndErrorHandling(handler)
