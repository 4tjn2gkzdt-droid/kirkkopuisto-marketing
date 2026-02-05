import { supabase } from '../../lib/supabase'
import { withCorsAndErrorHandling, AppError, ErrorTypes } from '../../lib/errorHandler'
import { createClaudeMessage } from '../../lib/api/claudeService'
import Anthropic from '@anthropic-ai/sdk'

// Configure API route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { templateType, customData = {}, events = [] } = req.body

  if (!templateType) {
    return res.status(400).json({ error: 'templateType puuttuu' })
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY puuttuu')
    }

    const anthropic = new Anthropic({ apiKey })

    // Määritellään mallipohjat
    const templates = {
      'top-3-events': {
        name: 'Viikon TOP 3 tapahtumat',
        description: 'Valitse ja korosta viikon kolme parasta tapahtumaa',
        prompt: (data) => `Luo houkutteleva somepostaus Kirkkopuiston Terassin viikon TOP 3 tapahtumasta.

TAPAHTUMAT:
${data.events.slice(0, 3).map((e, i) => `
${i + 1}. ${e.title}
   Päivä: ${new Date(e.date).toLocaleDateString('fi-FI', { weekday: 'long', day: 'numeric', month: 'long' })}
   ${e.artist ? `Artisti: ${e.artist}` : ''}
   ${e.summary || ''}
`).join('\n')}

LUO POSTAUS JOKA:
- Alkaa iskevällä otsikolla ("Viikon huiput! 🌟" tai vastaava)
- Listaa jokainen tapahtuma numeroidusti
- Luo innostusta ja odotusta
- Päättyy CTA:han (Varaa pöytä nyt!)
- Sisältää 5-8 relevanttia hashtagia

Tyyli: Energinen ja innostava
Max: 300 merkkiä`
      },
      'meet-the-artist': {
        name: 'Meet the Artist -sarja',
        description: 'Esittele artisti ja luo kiinnostusta',
        prompt: (data) => `Luo "Meet the Artist" -postaus artistille Kirkkopuiston Terassilla.

ARTISTI: ${data.artistName || 'Esiintyjä'}
PÄIVÄMÄÄRÄ: ${data.eventDate ? new Date(data.eventDate).toLocaleDateString('fi-FI') : ''}
GENRE/TYYLI: ${data.genre || 'live-musiikki'}
${data.bio ? `TAUSTA: ${data.bio}` : ''}

KRIITTISEN TÄRKEÄÄ:
1. Etsi ENSIN internetistä artistin virallinen kuvaus, biografia tai esittelyteksti
2. Käytä VAIN oikeaa, faktapohjaista tietoa artistista
3. ÄLÄ KEKSI tai spekuloi artistin tyylisuunnasta, taustasta tai saavutuksista
4. Jos et löydä luotettavaa tietoa, käytä vain annettuja tietoja (artistName, genre, bio)
5. Säilytä alkuperäisen kuvauksen sisältö - voit muotoilla tyyliin mutta FAKTAT PYSYVÄT SAMOINA

LUO POSTAUS JOKA:
- Alkaa "Meet the Artist 🎤" -teemalla
- Kertoo lyhyesti artistista FAKTATIEDON pohjalta (kuka, mistä, mitä musiikkia)
- Luo odotusta: "Älä missaa!"
- Jos tietoa ei löydy netistä eikä ole annettu, luo yleinen mutta houkutteleva kuvaus ILMAN keksittyjä faktoja
- Sisältää hashtagit: #meettheartist #livemusic #kirkkopuistonterassi

Tyyli: Informatiivinen mutta innostava, FAKTUAALINEN
Max: 250 merkkiä`
      },
      'behind-the-scenes': {
        name: 'Behind the Scenes',
        description: 'Näytä kulissien takana -sisältöä',
        prompt: (data) => `Luo "Behind the Scenes" -postaus Kirkkopuiston Terassista.

AIHE: ${data.topic || 'Kulissien takana'}
KONTEKSTI: ${data.context || 'Valmistautuminen illan tapahtumaan'}

LUO POSTAUS JOKA:
- Avaa näkymää kulissien taakse
- On henkilökohtainen ja aito
- Kiittää tiimiä tai korostaa työtä
- Luo yhteyttä yleisöön
- Sisältää hashtagit: #behindthescenes #teamwork #kirkkopuistonterassi

Tyyli: Aito, lämmin ja henkilökohtainen
Max: 200 merkkiä`
      },
      'customer-story': {
        name: 'Asiakastarina',
        description: 'Muuta asiakaspalaute tarinaksi',
        prompt: (data) => `Luo somepostaus asiakaspalautteen pohjalta Kirkkopuiston Terassille.

PALAUTE: "${data.feedback || 'Hienoa tunnelmaa ja loistava musiikki!'}"
${data.eventName ? `TAPAHTUMA: ${data.eventName}` : ''}
${data.customerName ? `ASIAKAS: ${data.customerName}` : ''}

LUO POSTAUS JOKA:
- Kiittää asiakasta
- Nostaa esiin palautteen parhaat osat
- Luo yhteisöllisyyttä
- Rohkaisee muita jakamaan kokemuksia
- Sisältää hashtagit: #asiakaspalaute #kiitos #kirkkopuistonterassi

Tyyli: Kiitollinen ja yhteisöllinen
Max: 180 merkkiä`
      },
      'weather-based': {
        name: 'Säähän perustuva viesti',
        description: 'Luo sisältöä sään mukaan',
        prompt: (data) => `Luo säähän perustuva somepostaus Kirkkopuiston Terassille.

SÄÄ: ${data.weather || 'aurinkoinen'}
LÄMPÖTILA: ${data.temperature || '20'}°C
VIIKONPÄIVÄ: ${data.weekday || 'perjantai'}
${data.upcomingEvent ? `TULEVA TAPAHTUMA: ${data.upcomingEvent}` : ''}

LUO POSTAUS JOKA:
- Hyödyntää säätä luovasti
- Luo kiinnostusta terassille tulemiseen
- Jos on tapahtuma, mainitse se
- Sopiva emoji-käyttö sään mukaan ☀️🌤️⛅
- Sisältää hashtagit: #terassi #turku #kirkkopuistonterassi

ESIMERKKEJÄ:
- Aurinkoinen: "Aurinko paistaa ja terassi kutsuu! ☀️"
- Sateinen: "Sade ei haittaa - meillä on katokset ja lämmintä tunnelmaa! ☔"
- Viileä: "Viileä ilta? Meillä on lämpölamput ja kuumat juomat! 🔥"

Tyyli: Positiivinen ja kutsuva
Max: 180 merkkiä`
      },
      'throwback': {
        name: 'Throwback / Nostalgia',
        description: 'Muistellaan menneitä tapahtumia',
        prompt: (data) => `Luo nostalgia-postaus Kirkkopuiston Terassin menneestä tapahtumasta.

TAPAHTUMA: ${data.eventName || 'menneestä tapahtumasta'}
PÄIVÄMÄÄRÄ: ${data.eventDate ? new Date(data.eventDate).toLocaleDateString('fi-FI') : 'aiemmin'}
${data.description ? `KUVAUS: ${data.description}` : ''}

LUO POSTAUS JOKA:
- Alkaa "#throwback" tai "Muistatko kun..." -tyylillä
- Herättää muistoja
- Luo odotusta tulevia tapahtumia kohtaan
- Kannustaa kommentoimaan muistoja
- Sisältää hashtagit: #throwback #memories #kirkkopuistonterassi

Tyyli: Nostalginen mutta positiivinen
Max: 200 merkkiä`
      },
      'last-minute': {
        name: 'Last Minute -markkinointi',
        description: 'Kiireellinen "viime hetken liput" -viesti',
        prompt: (data) => `Luo kiireellinen last minute -markkinointipostaus Kirkkopuiston Terassille.

TAPAHTUMA: ${data.eventName || 'tänään'}
AIKA: ${data.eventTime || 'tänä iltana'}
${data.artist ? `ARTISTI: ${data.artist}` : ''}
PAIKKOJEN TILANNE: ${data.availability || 'vielä paiккoja'}

LUO POSTAUS JOKA:
- Luo kiireellisyyttä (emoji ⏰🔥⚡)
- Korostaa että paiккoja on VIELÄ
- Selkeä CTA: "Varaa nyt!"
- Lyhyt ja iskevä
- Sisältää hashtagit: #lastminute #tänään #kirkkopuistonterassi

Tyyli: Kiireellinen, energinen, iskevä
Max: 150 merkkiä`
      },
      'thank-you': {
        name: 'Kiitos-postaus tapahtuman jälkeen',
        description: 'Kiitä osallistujia tapahtuman päätteeksi',
        prompt: (data) => `Luo kiitos-postaus tapahtuman jälkeen Kirkkopuiston Terassille.

TAPAHTUMA: ${data.eventName || 'eilinen tapahtuma'}
${data.artist ? `ARTISTI: ${data.artist}` : ''}
${data.highlights ? `KOHOKOHDAT: ${data.highlights}` : ''}

LUO POSTAUS JOKA:
- Kiittää kaikkia osallistujia
- Nostaa esiin illan parhaat hetket
- Luo yhteisöllisyyttä
- Mainitsee seuraavan tapahtuman jos tiedossa
- Sisältää hashtagit: #kiitos #amazing #kirkkopuistonterassi

Tyyli: Kiitollinen, lämmin, yhteisöllinen
Max: 200 merkkiä`
      }
    }

    const template = templates[templateType]

    if (!template) {
      return res.status(400).json({
        error: 'Tuntematon mallipohja',
        availableTemplates: Object.keys(templates)
      })
    }

    // Yhdistä tapahtumat ja custom data
    const promptData = {
      ...customData,
      events: events || []
    }

    const prompt = template.prompt(promptData)

    console.log(`Generating content for template: ${template.name}`)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      temperature: 0.8,
      messages: [{
        role: 'user',
        content: prompt
      }],
      system: `Olet luova sisällöntuottaja Kirkkopuiston Terassille Turussa.
Luo houkuttelevia, napakkoja ja aitoja somepostauksia.
Käytä suomea ja sopivasti emojeja.
Pidä tyyli rentona mutta ammattimaisena.

TÄRKEÄÄ - ARTISTIEN JA BÄNDIEN KUVAUKSET:
Kun käsittelet artisteja tai bändejä (erityisesti Tiistai LIVE, Torstai LIVE ja Flame Jazz Summer LIVE -sarjojen esiintyjiä):
1. Tunnista että kyseessä on artisti/bändi
2. Etsi internetistä artistin/bändin virallinen kuvaus, biografia tai esittelyteksti
3. Pidä sisältö USKOLLISENA alkuperäiselle kuvaukselle - älä keksi faktoja
4. Säilytä tärkeät tiedot kuten bändin tyylisuunta, keskeiset jäsenet, erityispiirteet ja saavutukset
5. Voit muotoilla tekstin Kirkkopuiston brändin mukaiseen tyyliin, mutta sisältö tulee pysyä samana
6. Jos et löydä luotettavaa tietoa artistista, käytä vain käytettävissä olevaa tietoa äläkä spekuloi`
    })

    const textContent = response.content.find(block => block.type === 'text')
    const generatedContent = textContent?.text || ''

    res.status(200).json({
      success: true,
      template: template.name,
      content: generatedContent,
      usage: response.usage
    })

  } catch (error) {
    console.error('Template generation error:', error)
    res.status(500).json({
      error: error.message,
      details: error.toString()
    })
  }
}

export default withCorsAndErrorHandling(handler)
