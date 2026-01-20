import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageUrl, analysisType = 'full' } = req.body

  if (!imageUrl) {
    return res.status(400).json({ error: 'imageUrl puuttuu' })
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY puuttuu')
    }

    const anthropic = new Anthropic({ apiKey })

    // Määritellään analyysityypit
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

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1536,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'url',
              url: imageUrl
            }
          },
          {
            type: 'text',
            text: analysis.prompt
          }
        ]
      }],
      system: `Olet kuva-analyytikko ja sisältöstrategisti Kirkkopuiston Terassille.
Analysoit kuvia ja ehdotat sopivaa sisältöä.
Vastaa AINA JSON-muodossa ilman markdown-muotoilua.`
    })

    const textContent = response.content.find(block => block.type === 'text')
    let contentText = textContent?.text || '{}'

    // Poista markdown code blocks
    contentText = contentText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    console.log('Claude vision response:', contentText.substring(0, 200))

    let parsed
    try {
      parsed = JSON.parse(contentText)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('Content was:', contentText)

      // Fallback
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

    res.status(200).json({
      success: true,
      analysisType: analysis.name,
      result: parsed,
      usage: response.usage
    })

  } catch (error) {
    console.error('Image analysis error:', error)

    // Jos virhe johtuu kuvasta, anna selkeä viesti
    if (error.message && error.message.includes('image')) {
      return res.status(400).json({
        error: 'Kuvan lataaminen epäonnistui',
        details: 'Tarkista että kuvan URL on julkinen ja saavutettavissa',
        originalError: error.message
      })
    }

    res.status(500).json({
      error: error.message,
      details: error.toString()
    })
  }
}
