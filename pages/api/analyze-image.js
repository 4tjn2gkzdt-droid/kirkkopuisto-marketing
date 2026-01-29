import { withCorsAndErrorHandling, AppError, ErrorTypes } from '../../lib/errorHandler'
import { analyzeImageWithClaude } from '../../lib/api/claudeService'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageUrl, analysisType = 'full' } = req.body

  if (!imageUrl) {
    throw new AppError('imageUrl puuttuu', ErrorTypes.VALIDATION)
  }

  const analysisPrompts = {
    full: {
      name: 'Täydellinen analyysi',
      prompt: `Analysoi tämä kuva Kirkkopuiston Terassin somepostausta varten.

ANNA ANALYYSI SEURAAVISTA:
1. **Tunnelma**: Millainen tunnelma kuvasta välittyy? (esim. intiimi, energinen, rento, juhla)
2. **Värit**: Mitkä värit dominoivat? Sopivatko brändiväreille (vihreä)?
3. **Elementit**: Mitä kuvassa näkyy? (ihmiset, musiikki, ruoka, juoma, terassi)
4. **Aika**: Päivä vai ilta? Mikä vuodenaika?
5. **Soveltuva käyttö**: Mihin kanavaan (Instagram/Facebook/jne.) ja milloin julkaista?

Muotoile JSON:
{
  "mood": "tunnelma",
  "colors": ["väri1", "väri2"],
  "elements": ["elementti1", "elementti2"],
  "timeOfDay": "päivä/ilta",
  "season": "kevät/kesä/syksy/talvi",
  "channels": ["Instagram", "Facebook"],
  "bestTime": "milloin julkaista",
  "caption": "ehdotettu kuvateksti (max 200 merkkiä)"
}

Vastaa VAIN JSON:lla.`
    },
    mood: {
      name: 'Tunnelma-analyysi',
      prompt: `Analysoi tämän kuvan tunnelma.

Kerro:
- Millainen tunnelma? (intiimi, energinen, rauhallinen, juhla, rento...)
- Minkälaisia tunteita herättää?
- Sopiiko Kirkkopuiston Terassin brändiin?

Vastaa JSON:
{
  "mood": "tunnelma",
  "feelings": ["tunne1", "tunne2"],
  "brandFit": "kyllä/ei, miksi",
  "caption": "ehdotettu tunnelmaa kuvaava teksti (max 150 merkkiä)"
}`
    },
    caption: {
      name: 'Kuvateksti-ehdotus',
      prompt: `Luo houkutteleva kuvateksti tälle kuvalle Kirkkopuiston Terassin someen.

LUO:
- Napakka, iskevä kuvateksti (max 200 merkkiä)
- Sopivat hashtagit (5-8 kpl)
- CTA jos sopiva

Vastaa JSON:
{
  "caption": "kuvateksti",
  "hashtags": ["#tag1", "#tag2"],
  "cta": "toimintakehotus jos sopiva"
}`
    }
  }

  const analysis = analysisPrompts[analysisType] || analysisPrompts.full

  console.log(`Analyzing image with type: ${analysis.name}`)

  try {
    const result = await analyzeImageWithClaude({
      imageUrl,
      prompt: analysis.prompt,
      systemPrompt: `Olet kuva-analyytikko ja sisältöstrategisti Kirkkopuiston Terassille.
Analysoit kuvia ja ehdotat sopivaa sisältöä.
Vastaa AINA JSON-muodossa ilman markdown-muotoilua.`,
      maxTokens: 1536
    })

    let contentText = result.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(contentText)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)

      return res.status(200).json({
        success: true,
        analysisType: analysis.name,
        result: {
          mood: 'positiivinen',
          caption: 'Tule nauttimaan Kirkkopuiston Terassille! 🌿',
          rawResponse: contentText
        },
        fallback: true
      })
    }

    return res.status(200).json({
      success: true,
      analysisType: analysis.name,
      result: parsed,
      usage: result.usage
    })
  } catch (error) {
    if (error.message && error.message.includes('image')) {
      throw new AppError(
        'Kuvan lataaminen epäonnistui',
        ErrorTypes.VALIDATION,
        { help: 'Tarkista että kuvan URL on julkinen ja saavutettavissa', originalError: error.message }
      )
    }
    throw error
  }
}

export default withCorsAndErrorHandling(handler)
