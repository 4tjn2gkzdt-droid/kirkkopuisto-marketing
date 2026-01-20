import Anthropic from '@anthropic-ai/sdk'
import cors from '../../lib/cors'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    originalContent,
    originalEvent,
    recycleType, // 'update', 'nostalgia', 'repurpose'
    newContext = {}
  } = req.body

  if (!originalContent) {
    return res.status(400).json({ error: 'originalContent puuttuu' })
  }

  if (!recycleType) {
    return res.status(400).json({ error: 'recycleType puuttuu (update/nostalgia/repurpose)' })
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY puuttuu')
    }

    const anthropic = new Anthropic({ apiKey })

    // Määritellään kierrätystyypit
    const recycleInstructions = {
      'update': {
        name: 'Päivitä uuteen kontekstiin',
        prompt: `Päivitä tämä vanha somepostaus uuteen kontekstiin.

ALKUPERÄINEN POSTAUS:
"${originalContent}"

${originalEvent ? `ALKUPERÄINEN TAPAHTUMA: ${originalEvent.title} (${originalEvent.date})` : ''}

UUSI KONTEKSTI:
${newContext.newEvent ? `Uusi tapahtuma: ${newContext.newEvent.title}` : ''}
${newContext.newDate ? `Uusi päivämäärä: ${newContext.newDate}` : ''}
${newContext.newArtist ? `Uusi artisti: ${newContext.newArtist}` : ''}

LUO PÄIVITETTY VERSIO:
- Säilytä alkuperäisen postauksen tyyli ja sävy
- Päivitä päivämäärät ja nimet uusiksi
- Pidä sama energia ja houkuttelevuus
- Jos hashtagit oli mukana, päivitä ne sopiviksi
- Max 300 merkkiä

Anna VAIN päivitetty postaus, ei muuta tekstiä.`
      },
      'nostalgia': {
        name: 'Luo nostalgia-postaus',
        prompt: `Luo nostalgia-postaus ("Muistatko kun...") vanhan tapahtuman pohjalta.

ALKUPERÄINEN TAPAHTUMA:
${originalEvent ? `${originalEvent.title} - ${new Date(originalEvent.date).toLocaleDateString('fi-FI')}` : 'Menneisyydestä'}
${originalEvent?.artist ? `Artisti: ${originalEvent.artist}` : ''}

${originalContent ? `ALKUPERÄINEN POSTAUS:\n"${originalContent}"` : ''}

UUSI KONTEKSTI:
${newContext.currentEvent ? `Tuleva vastaava tapahtuma: ${newContext.currentEvent}` : ''}

LUO NOSTALGIA-POSTAUS JOKA:
- Alkaa #throwback tai "Muistatko kun..." -tyylillä
- Viittaa alkuperäiseen tapahtumaan
- Herättää lämpim iä muistoja
- Jos on tuleva vastaava tapahtuma, linkitä siihen: "...ja nyt sama tunnelma jatkuu!"
- Kannustaa kommentoimaan muistoja
- Sisältää hashtagit: #throwback #memories #kirkkopuistonterassi
- Max 250 merkkiä

Anna VAIN nostalgia-postaus, ei muuta tekstiä.`
      },
      'repurpose': {
        name: 'Muotoile eri kanavalle',
        prompt: `Muotoile tämä somepostaus eri kanavalle.

ALKUPERÄINEN POSTAUS:
"${originalContent}"

${originalEvent ? `TAPAHTUMA: ${originalEvent.title}` : ''}

UUSI KANAVA: ${newContext.targetChannel || 'Instagram'}

KANAVASPESIFISET OHJEET:
${newContext.targetChannel === 'Instagram' ? '- Lyhyt ja visuaalinen\n- Paljon emojeja\n- 5-10 hashtagia' : ''}
${newContext.targetChannel === 'Facebook' ? '- Pidempi ja informatiivinen\n- Yhteisöllinen sävy\n- 3-5 hashtagia' : ''}
${newContext.targetChannel === 'TikTok' ? '- Erittäin lyhyt\n- Trendi ja nuorekas\n- Max 5 hashtagia' : ''}
${newContext.targetChannel === 'LinkedIn' ? '- Ammattimainen\n- Bisnes-kulma\n- Vähän hashtageja' : ''}
${newContext.targetChannel === 'newsletter' ? '- Informatiivinen\n- Selkeä ja kattava\n- Ei hashtageja' : ''}

LUO UUSI VERSIO:
- Säilytä ydinsanoma
- Mukauta kanavalle sopivaksi
- Optimoi pituus ja tyyli

Anna VAIN uusi postaus, ei muuta tekstiä.`
      }
    }

    const instruction = recycleInstructions[recycleType]

    if (!instruction) {
      return res.status(400).json({
        error: 'Tuntematon kierrätystyyppi',
        availableTypes: Object.keys(recycleInstructions)
      })
    }

    console.log(`Recycling content with type: ${instruction.name}`)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: instruction.prompt
      }],
      system: `Olet sisällön kierrättäjä Kirkkopuiston Terassille.
Muotoilet ja päivität vanhaa sisältöä uuteen käyttöön.
Säilytä tunnelma mutta päivitä konteksti.
Vastaa VAIN lopullisella postauksella, ei selityksiä.`
    })

    const textContent = response.content.find(block => block.type === 'text')
    const recycledContent = textContent?.text || ''

    res.status(200).json({
      success: true,
      recycleType: instruction.name,
      originalContent,
      recycledContent,
      usage: response.usage
    })

  } catch (error) {
    console.error('Content recycling error:', error)
    res.status(500).json({
      error: error.message,
      details: error.toString()
    })
  }
}

export default cors(handler)
