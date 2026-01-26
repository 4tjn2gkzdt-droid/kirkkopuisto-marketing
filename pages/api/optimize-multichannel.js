import { withCorsAndErrorHandling, AppError, ErrorTypes } from '../../lib/errorHandler'
import { createClaudeMessage } from '../../lib/api/claudeService'
import { getHistoricalContent } from '../../lib/api/brainstormService'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { event, channels = [] } = req.body

  if (!event || !event.title) {
    throw new AppError('Tapahtuman tiedot puuttuvat', ErrorTypes.VALIDATION)
  }

  if (!channels || channels.length === 0) {
    throw new AppError('Valitse vähintään yksi kanava', ErrorTypes.VALIDATION)
  }

    console.log('Optimizing content for channels:', channels)

    // Kanavakohtaiset ohjeet
    const channelInstructions = {
      instagram: {
        name: 'Instagram',
        maxLength: 2200,
        style: 'Lyhyt, visuaalinen, emoji-ystävällinen. Käytä 5-10 relevanttia hashtagia lopussa. Rohkaise kommentoimaan ja jakamaan.',
        format: 'caption',
        extras: 'Lisää kysymys tai CTA joka rohkaisee vuorovaikutukseen.'
      },
      facebook: {
        name: 'Facebook',
        maxLength: 5000,
        style: 'Pidempi, informatiivinen ja yhteisöllinen. Voi olla enemmän yksityiskohtia. Hashtagit kohtuudella (3-5).',
        format: 'post',
        extras: 'Voi sisältää enemmän taustatarinaa ja yksityiskohtia. Rohkaise tagging ja sharing.'
      },
      tiktok: {
        name: 'TikTok',
        maxLength: 2200,
        style: 'Erittäin lyhyt, trendikäs, nuorekas kieli. Käytä trendikkäitä ilmaisuja ja hashtageja. Energinen sävy.',
        format: 'caption',
        extras: 'Viittaa mahdollisiin TikTok-trendeihin tai haasteisiin. Maksimissaan 5 hashtagia.'
      },
      linkedin: {
        name: 'LinkedIn',
        maxLength: 3000,
        style: 'Ammattimainen, bisnes-orientoitunut. Korosta tapahtuman arvoa, verkostoitumista ja liiketoimintaa. Harvemmin hashtageja.',
        format: 'post',
        extras: 'Voi mainita business-kulman, networking-mahdollisuudet tai yritystapahtumia.'
      },
      newsletter: {
        name: 'Uutiskirje (Sähköposti)',
        maxLength: 1000,
        style: 'Informatiivinen, kattava kuvaus. Selkeä struktuuri. Ei hashtageja, mutta CTA-linkit.',
        format: 'email',
        extras: 'Sisällytä: mitä, milloin, missä, miksi tulla. Lisää selkeä varausohje.'
      }
    }

    // Luo yksittäinen prompt kaikille kanaville
    const selectedChannels = channels.filter(ch => channelInstructions[ch])

    if (selectedChannels.length === 0) {
      return res.status(400).json({ error: 'Ei kelvollisia kanavia valittu' })
    }

    const eventDate = event.date ? new Date(event.date).toLocaleDateString('fi-FI', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) : 'Päivämäärä ei tiedossa'

    const eventTime = event.time || ''

    // Hae historiallista dataa kontekstiksi
    let historicalContext = ''
    try {
      const historicalData = await getHistoricalContent({
        types: ['news', 'newsletter', 'social_post'],
        limit: 10,
        isActive: true
      })

      if (historicalData && historicalData.length > 0) {
        historicalContext = `\n\nHISTORIALLISTA SISÄLTÖÄ INSPIRAATIOKSI (aikaisempia postauksia ja uutisia):

${historicalData.map((item, index) => `
${index + 1}. ${item.title} (${item.type}, ${item.year || 'ei vuotta'})
${item.summary || item.content.substring(0, 200)}...
`).join('\n')}

Käytä näitä esimerkkejä inspiraationa sävylle ja tyylille, mutta luo täysin uusi sisältö nykyiselle tapahtumalle.
`
      }
    } catch (error) {
      console.error('Failed to fetch historical content:', error)
      // Jatka ilman historiallista dataa
    }

    const prompt = `Luo markkinointisisältöä Kirkkopuiston Terassin tapahtumalle eri kanaviin.

TAPAHTUMAN TIEDOT:
- Nimi: ${event.title}
- Artisti/Esiintyjä: ${event.artist || 'Ei määritelty'}
- Päivämäärä: ${eventDate}
- Kellonaika: ${eventTime}
- Kuvaus: ${event.summary || 'Ei kuvausta'}
${historicalContext}
LUO OPTIMOITU SISÄLTÖ SEURAAVILLE KANAVILLE:

${selectedChannels.map(channel => {
  const instr = channelInstructions[channel]
  return `
${instr.name.toUpperCase()}:
- Tyyli: ${instr.style}
- Max pituus: ${instr.maxLength} merkkiä
- Muoto: ${instr.format}
- Huomioitavaa: ${instr.extras}
`
}).join('\n')}

MUOTOILE VASTAUS JSON-MUODOSSA:
{
  "contents": {
    ${selectedChannels.map(ch => `"${ch}": "sisältö tähän"`).join(',\n    ')}
  }
}

TÄRKEÄÄ:
- Jokaiselle kanavalle ERILAINEN sisältö, optimoitu kyseiselle alustalle
- Pidä tekstit napakkoina ja houkuttelevina
- Käytä emojeja kohtuudella (enemmän Instassa/TikTokissa, vähemmän LinkedInissä)
- Instagram ja TikTok: hashtagit mukaan
- Facebook: yhteisöllisyys
- LinkedIn: ammattimainen kulma
- Newsletter: informatiivinen ja selkeä

Vastaa VAIN puhtaalla JSON:lla, ei muuta tekstiä.`

  console.log('Sending request to Claude API...')

  const result = await createClaudeMessage({
    message: prompt,
    systemPrompt: `Olet markkinointisisällön optimoija Kirkkopuiston Terassille.
Luot erilaista sisältöä eri kanaviin, huomioiden kunkin kanavan ominaisuudet ja yleisön.
Vastaa AINA JSON-muodossa ilman markdown-muotoilua.`,
    maxTokens: 3072,
    temperature: 0.7
  })

  let contentText = result.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  let parsed
  try {
    parsed = JSON.parse(contentText)
  } catch (parseError) {
    console.error('JSON parse error:', parseError)

    // Fallback: luo yksinkertainen sisältö
    const fallback = {}
    selectedChannels.forEach(channel => {
      fallback[channel] = `${event.title}${event.artist ? ' - ' + event.artist : ''}\n\n${eventDate}${eventTime ? ' klo ' + eventTime : ''}\n\nTule nauttimaan! 🎵\n\n#kirkkopuistonterassi #turku`
    })

    return res.status(200).json({
      success: true,
      contents: fallback,
      usage: result.usage,
      fallback: true,
      error: 'JSON parse failed, using fallback'
    })
  }

  // Validoi että kaikki pyydetyt kanavat on vastauksessa
  const contents = parsed.contents || parsed
  const missingChannels = selectedChannels.filter(ch => !contents[ch])

  if (missingChannels.length > 0) {
    console.warn('Missing channels in response:', missingChannels)
    missingChannels.forEach(channel => {
      contents[channel] = `${event.title}${event.artist ? ' - ' + event.artist : ''}\n\n${eventDate}${eventTime ? ' klo ' + eventTime : ''}\n\nTervetuloa! 🎵`
    })
  }

  return res.status(200).json({
    success: true,
    contents,
    usage: result.usage,
    channels: selectedChannels
  })
}

export default withCorsAndErrorHandling(handler)
