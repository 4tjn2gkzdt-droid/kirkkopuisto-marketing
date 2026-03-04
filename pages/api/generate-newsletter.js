import { supabaseAdmin } from '../../lib/supabase-admin'
import { Resend } from 'resend'
import Anthropic from '@anthropic-ai/sdk'
import { BRAND_VOICE_PROMPT } from '../../lib/brand-voice'

const formatLocalDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseLocalDate = (dateString) => {
  if (!dateString) return new Date()
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Lazy-load Resend vain kun sitä tarvitaan
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey || apiKey === 'your_resend_api_key_here') {
    throw new Error('RESEND_API_KEY puuttuu tai on placeholder-arvo. Aseta oikea API-avain .env.local tiedostoon.')
  }
  return new Resend(apiKey)
}

// Disable body parser size limit and configure API route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

export default async function handler(req, res) {
  // Set CORS headers first
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')
  res.setHeader('Content-Type', 'application/json')

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  console.log('=== GENERATE-NEWSLETTER API CALLED ===')
  console.log('Request method:', req.method)

  try {
    if (req.method !== 'POST') {
      console.log('Method not allowed:', req.method)
      return res.status(405).json({ error: 'Method not allowed' })
    }
    console.log('Method check passed')

    // Tarkista että Supabase on konfiguroitu
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        error: 'Supabase ei ole konfiguroitu. Tarkista NEXT_PUBLIC_SUPABASE_URL ja SUPABASE_SERVICE_ROLE_KEY environment-muuttujat.'
      })
    }

    const {
      tone = 'casual', // casual, formal, energetic
      sendEmails = false,
      selectedVariant = 0, // Mikä variantti lähetetään (0-2)
      selectedEventIds = [] // Valitut tapahtumat - AINOA pakollinen kenttä!
    } = req.body
    console.log('Newsletter generation request:', {
      selectedEventIds,
      selectedEventIdsCount: selectedEventIds?.length || 0,
      tone,
      sendEmails
    })

    // Tarkista että tapahtumia on valittu
    if (!selectedEventIds || selectedEventIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Valitse vähintään yksi tapahtuma'
      })
    }

    // Hae tapahtumat SUORAAN ID:n perusteella - ei päivämääräsuodatuksia!
    console.log('=== NEWSLETTER API: Fetching events ===')
    console.log('Selected event IDs:', selectedEventIds)
    console.log('IDs type:', typeof selectedEventIds[0])
    console.log('IDs count:', selectedEventIds.length)

    const { data: events, error: eventsError } = await supabaseAdmin
      .from('events')
      .select('*')
      .in('id', selectedEventIds)
      .order('date', { ascending: true })

    console.log('=== NEWSLETTER API: Query result ===')
    console.log('Events found:', events?.length || 0)
    console.log('Error:', eventsError)
    if (events && events.length > 0) {
      console.log('First event:', {
        id: events[0].id,
        title: events[0].title,
        date: events[0].date
      })
    }

    if (eventsError) {
      console.error('=== NEWSLETTER API: Supabase error ===')
      console.error('Error details:', eventsError)
      return res.status(500).json({
        success: false,
        error: 'Tietokantavirhe tapahtumien haussa',
        details: eventsError.message,
        debug: {
          selectedEventIds,
          errorCode: eventsError.code,
          errorHint: eventsError.hint
        }
      })
    }

    if (!events || events.length === 0) {
      console.log('=== NEWSLETTER API: No events found ===')
      console.log('Selected IDs:', selectedEventIds)

      // Kokeile hakea KAIKKI tapahtumat debuggausta varten
      const { data: allEvents, error: allEventsError } = await supabaseAdmin
        .from('events')
        .select('id, title, date')
        .limit(10)

      console.log('All events in database (first 10):', allEvents?.map(e => ({
        id: e.id,
        idType: typeof e.id,
        title: e.title
      })))

      return res.status(400).json({
        success: false,
        error: 'Valittuja tapahtumia ei löytynyt tietokannasta',
        debug: {
          selectedEventIds,
          selectedEventIdsTypes: selectedEventIds.map(id => typeof id),
          selectedEventIdsCount: selectedEventIds?.length || 0,
          databaseHasEvents: (allEvents?.length || 0) > 0,
          sampleDatabaseIds: allEvents?.slice(0, 3).map(e => ({ id: e.id, type: typeof e.id }))
        }
      })
    }

    // Laske aikavälä tapahtumista automaattisesti
    const eventDates = events.map(e => parseLocalDate(e.date)).sort((a, b) => a - b)
    const startDate = formatLocalDate(eventDates[0])
    const endDate = formatLocalDate(eventDates[eventDates.length - 1])

    console.log('Auto-calculated date range from events:', startDate, '-', endDate)

    const selectedEvents = events

    // Muotoile valitut tapahtumat AI:lle (korostettavat)
    const eventsText = selectedEvents.map(event => {
      const eventDate = new Date(event.date)
      const dateStr = eventDate.toLocaleDateString('fi-FI', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })
      return `- ${dateStr}: ${event.title}${event.artist ? ` - ${event.artist}` : ''}${event.summary ? `\n  Kuvaus: ${event.summary}` : ''}`
    }).join('\n')

    // Luo prompt Claude AI:lle
    const toneInstructions = {
      casual: 'Käytä rentoa, leikkisää ja helposti lähestyttävää sävyä. Sinutellaan lukijaa.',
      formal: 'Käytä ammattitaitoista, asiallista mutta lämmintä sävyä. Sinutellaan lukijaa.',
      energetic: 'Käytä energistä, innostavaa ja positiivista sävyä. Sinutellaan lukijaa.'
    }

    const prompt = `Luo houkutteleva uutiskirje Kirkkopuiston Terassin tulevista tapahtumista.

TYYLI: ${toneInstructions[tone] || toneInstructions.casual}
- SINUTTELE lukijaa aina
- Ole leikkisä mutta vältä liikaa imelyyttä
- Älä käytä liioiteltuja ilmaisuja

TÄRKEÄÄ:
- Kirkkopuistossa EI VOI varata pöytiä eikä sinne myydä lippuja
- ÄLÄ mainitse pöytävarauksia tai lippuja missään vaiheessa
- Keskity tapahtumien tunnelmaan ja kokemukseen

TAPAHTUMAT (${new Date(startDate).toLocaleDateString('fi-FI')} - ${new Date(endDate).toLocaleDateString('fi-FI')}):
${eventsText}

LUO UUTISKIRJE SEURAAVILLA OSIOILLA:

1. **OTSIKKO** (subject line, 50-70 merkkiä, houkutteleva)
2. **JOHDANTO** (1-2 kappaletta, luo tunnelmaa ja innostusta)
3. **TAPAHTUMAKORTIT** (jokaiselle tapahtumalle oma osio, 2-3 lausetta per tapahtuma)
4. **CTA-LOPPUOSA** (Call-to-action: rohkaise tulemaan paikalle, seuraamaan somessa, kertomaan kavereillekin)

MUOTOILE VASTAUS TÄHÄN JSON-MUOTOON:
{
  "subject": "otsikko tähän",
  "intro": "johdanto tähän",
  "events": [
    {
      "title": "tapahtuman nimi",
      "date": "päivämäärä tekstinä",
      "description": "kuvaus tähän"
    }
  ],
  "cta": "loppukehotus tähän"
}

Pidä teksti napakkana ja helppolukuisena. Käytä emojeja säästeliäästi.`

    // Kutsu Claude API:ta - luo 3 varianttia
    console.log('About to check Anthropic API key...')
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY puuttuu')
    }
    console.log('Anthropic API key exists, creating client...')

    const anthropic = new Anthropic({ apiKey })
    console.log('Anthropic client created successfully')

    console.log('Generating newsletter variants with Claude AI...')

    // VÄLIAIKAINEN: Generoi vain 1 versio testiä varten, muutetaan takaisin 3:ksi kun toimii
    const variantPromises = [0].map(async (index) => {
      console.log(`Starting to generate variant ${index + 1}...`)

      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 2048,
          temperature: 0.7 + (index * 0.15), // Vähän eri temperature jokaiselle
          messages: [{
            role: 'user',
            content: prompt
          }],
          system: `${BRAND_VOICE_PROMPT}

Luo houkuttelevia uutiskirjeitä brändiäänen mukaisesti.
Sinuttele lukijaa aina. Ole leikkisä mutta vältä liikaa imelyyttä.
Vastaa AINA JSON-muodossa. Älä lisää markdown-muotoilua tai muuta tekstiä, vain puhdas JSON.`
        })

        console.log(`Variant ${index + 1} API call completed`)
        console.log(`Response ID: ${response.id}`)
        console.log(`Response model: ${response.model}`)
        console.log(`Response usage:`, response.usage)

        const textContent = response.content.find(block => block.type === 'text')
        let contentText = textContent?.text || '{}'

        console.log(`Variant ${index + 1} content length:`, contentText.length)

        // Poista mahdolliset markdown code block -merkit
        contentText = contentText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

        try {
          const parsed = JSON.parse(contentText)
          console.log(`Variant ${index + 1} parsed successfully`)
          return {
            variant: index + 1,
            content: parsed,
            usage: response.usage
          }
        } catch (parseError) {
          console.error(`Failed to parse variant ${index + 1}:`, contentText)
          // Palauta fallback
          return {
            variant: index + 1,
            content: {
              subject: `Tulevat tapahtumat Kirkkopuiston Terassilla`,
              intro: `Katso mitä jännittävää on tulossa!`,
              events: selectedEvents.map(e => ({
                title: e.title,
                date: new Date(e.date).toLocaleDateString('fi-FI'),
                description: e.summary || 'Tule mukaan!'
              })),
              cta: 'Tule nauttimaan livemusiikista ja terassitunnelmasta! 🎵'
            },
            usage: response.usage,
            parseError: true
          }
        }
      } catch (anthropicError) {
        console.error(`Anthropic API error for variant ${index + 1}:`, anthropicError)
        throw anthropicError
      }
    })

    const variants = await Promise.all(variantPromises)

    console.log('Generated variants:', variants.length)

    // Generoi HTML-esikatselu valitulle variantille
    const selectedContent = variants[selectedVariant]?.content || variants[0]?.content

    const html = generateNewsletterHTML(selectedContent, events, startDate, endDate)

    // Jos pyydetään lähettämään sähköpostit
    if (sendEmails) {
      const { data: teamMembers, error: teamError } = await supabaseAdmin
        .from('team_members')
        .select('*')
        .not('email', 'is', null)

      if (teamError) throw teamError

      if (!teamMembers || teamMembers.length === 0) {
        return res.status(400).json({
          error: 'Ei vastaanottajia. Lisää tiimin jäsenille sähköpostiosoitteet.'
        })
      }

      // Luo Resend-client vasta kun sitä tarvitaan
      const resend = getResendClient()

      // Lähetä sähköposti
      const emailPromises = teamMembers.map(member =>
        resend.emails.send({
          from: 'Kirkkopuiston Terassi <noreply@foodandwineturku.com>',
          to: member.email,
          subject: selectedContent.subject,
          html: html
        })
      )

      const results = await Promise.allSettled(emailPromises)
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      return res.status(200).json({
        success: true,
        sent: true,
        emailsSent: successful,
        emailsFailed: failed,
        recipients: teamMembers,
        events,
        variants,
        selectedVariant
      })
    }

    // Palauta esikatselu
    res.status(200).json({
      success: true,
      sent: false,
      events,
      variants,
      html,
      dateRange: {
        start: new Date(startDate).toLocaleDateString('fi-FI'),
        end: new Date(endDate).toLocaleDateString('fi-FI')
      }
    })

  } catch (error) {
    console.error('=== NEWSLETTER API: Unexpected error ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error code:', error.code)
    console.error('Error stack:', error.stack)
    console.error('Full error object:', JSON.stringify(error, null, 2))

    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error',
      errorType: error.constructor.name,
      errorName: error.name,
      errorCode: error.code,
      details: error.toString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}

// HTML-generaattori funktio
function generateNewsletterHTML(content, allEvents, startDate, endDate) {
  // Korostettavat tapahtumat (yksityiskohtaiset kortit)
  const eventCards = content.events.map((event) => {
    // Etsi alkuperäinen tapahtuma kuvaa varten
    const originalEvent = allEvents.find(e => e.title === event.title)
    const imageUrl = originalEvent?.images?.[0] || ''

    return `
      <div style="background: white; border-radius: 10px; overflow: hidden; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        ${imageUrl ? `
          <img src="${imageUrl}" alt="${event.title}" style="width: 100%; height: 200px; object-fit: cover;">
        ` : ''}
        <div style="padding: 20px;">
          <h3 style="margin: 0 0 10px 0; color: #16a34a; font-size: 20px;">${event.title}</h3>
          <p style="margin: 5px 0; color: #666; font-size: 14px;">📅 ${event.date}</p>
          <p style="margin: 15px 0 0 0; color: #333; line-height: 1.6;">${event.description}</p>
        </div>
      </div>
    `
  }).join('')

  // Kaikki tapahtumat selkeänä listana
  const allEventsList = allEvents.map(event => {
    const eventDate = new Date(event.date)
    const dateStr = eventDate.toLocaleDateString('fi-FI', {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric'
    })
    const timeStr = event.time ? ` klo ${event.time}` : ''

    return `
      <div style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
        <span style="font-weight: 600; color: #16a34a;">🎵</span>
        <strong style="color: #111827;">${event.title}</strong>
        ${event.artist ? `<span style="color: #6b7280;"> - ${event.artist}</span>` : ''}
        <br>
        <span style="color: #6b7280; font-size: 14px; margin-left: 20px;">
          ${dateStr}${timeStr}
        </span>
      </div>
    `
  }).join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
    }
    .header {
      background: linear-gradient(135deg, #16a34a 0%, #059669 100%);
      color: white;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      font-weight: 700;
    }
    .header p {
      margin: 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 30px 20px;
    }
    .intro {
      font-size: 16px;
      line-height: 1.8;
      color: #333;
      margin-bottom: 30px;
    }
    .cta-section {
      background: linear-gradient(135deg, #16a34a 0%, #059669 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px;
      margin: 30px 0;
    }
    .cta-section p {
      margin: 0 0 20px 0;
      font-size: 18px;
      line-height: 1.6;
    }
    .button {
      display: inline-block;
      background: white;
      color: #16a34a;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 25px;
      font-weight: 600;
      margin: 5px;
    }
    .footer {
      text-align: center;
      padding: 30px 20px;
      color: #999;
      font-size: 12px;
      background: #f9fafb;
    }
    .social-links {
      margin: 20px 0;
    }
    .social-links a {
      display: inline-block;
      margin: 0 10px;
      color: #16a34a;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌿 Kirkkopuiston Terassi</h1>
      <p>${new Date(startDate).toLocaleDateString('fi-FI')} - ${new Date(endDate).toLocaleDateString('fi-FI')}</p>
    </div>

    <div class="content">
      <div class="intro">
        ${content.intro.split('\n').map(p => `<p>${p}</p>`).join('')}
      </div>

      ${eventCards}

      <div class="cta-section">
        <p>${content.cta}</p>
        <a href="https://www.kirkkopuistonterassi.fi" class="button">Tutustu tapahtumiin</a>
        <a href="https://www.instagram.com/kirkkopuistonterassi" class="button">Seuraa Instagramissa</a>
        <a href="https://www.facebook.com/kirkkopuistonterassi" class="button">Seuraa Facebookissa</a>
      </div>

      <!-- Kaikki tapahtumat listana -->
      <div style="background: #f9fafb; border-radius: 10px; padding: 20px; margin: 30px 0;">
        <h3 style="margin: 0 0 15px 0; color: #16a34a; font-size: 18px;">📅 Kaikki tapahtumat</h3>
        <div style="background: white; border-radius: 8px; padding: 15px;">
          ${allEventsList}
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="social-links">
        <a href="https://www.instagram.com/kirkkopuistonterassi">Instagram</a> |
        <a href="https://www.facebook.com/kirkkopuistonterassi">Facebook</a>
      </div>
      <p>Kirkkopuiston Terassi, Turku</p>
      <p>Tämä on automaattisesti generoitu uutiskirje.</p>
      <p>Generoitu: ${new Date().toLocaleDateString('fi-FI')} ${new Date().toLocaleTimeString('fi-FI')}</p>
    </div>
  </div>
</body>
</html>
  `
}
