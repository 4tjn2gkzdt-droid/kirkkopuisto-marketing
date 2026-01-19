import { supabase } from '../../lib/supabase'
import { Resend } from 'resend'
import Anthropic from '@anthropic-ai/sdk'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    startDate: startDateStr, // Alkupäivämäärä (YYYY-MM-DD)
    endDate: endDateStr,     // Loppupäivämäärä (YYYY-MM-DD)
    tone = 'casual', // casual, formal, energetic
    sendEmails = false,
    selectedVariant = 0, // Mikä variantti lähetetään (0-2)
    selectedEventIds = [] // Valitut tapahtumat korostettavaksi
  } = req.body

  try {
    // Käytä päivämäärämerkkijonoja suoraan (välttää aikavyöhykeongelmia)
    const startDate = startDateStr
    const endDate = endDateStr

    console.log('Newsletter generation request:', {
      startDate,
      endDate,
      selectedEventIds,
      selectedEventIdsCount: selectedEventIds?.length || 0
    })

    // Hae kaikki tapahtumat aikaväliltä
    console.log('Fetching events by date range:', startDate, '-', endDate)
    console.log('Selected event IDs:', selectedEventIds)

    const result = await supabase
      .from('events')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    let events = result.data || []
    let eventsError = result.error

    console.log('All events from date range:', {
      eventsCount: events.length,
      error: eventsError,
      eventIds: events.map(e => e.id)
    })

    // Jos valittuja tapahtumia on, suodata vain ne
    if (selectedEventIds && selectedEventIds.length > 0) {
      const selectedIdsSet = new Set(selectedEventIds)
      events = events.filter(event => selectedIdsSet.has(event.id))
      console.log('After filtering by selected IDs:', {
        selectedCount: events.length,
        selectedIds: events.map(e => e.id)
      })
    }

    console.log('Final events:', {
      eventsCount: events.length,
      firstEvent: events[0]?.date,
      lastEvent: events[events.length - 1]?.date
    })

    if (eventsError) {
      throw eventsError
    }

    if (!events || events.length === 0) {
      console.log('No events found')
      return res.status(200).json({
        success: true,
        message: 'Ei tapahtumia valitulla aikavälillä',
        events: [],
        variants: []
      })
    }

    // Jos valittuja tapahtumia on, käytä niitä; muuten käytä kaikkia aikavälin tapahtumia
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
      casual: 'Käytä rentoa, ystävällistä ja helposti lähestyttävää sävyä. Ikään kuin juttelisit ystävällesi.',
      formal: 'Käytä ammattitaitoista, asiallista mutta lämmintä sävyä.',
      energetic: 'Käytä energistä, innostavaa ja positiivista sävyä. Ole innostunut!'
    }

    const prompt = `Luo houkutteleva uutiskirje Kirkkopuiston Terassin tulevista tapahtumista.

TYYLI: ${toneInstructions[tone] || toneInstructions.casual}

TAPAHTUMAT (${new Date(startDate).toLocaleDateString('fi-FI')} - ${new Date(endDate).toLocaleDateString('fi-FI')}):
${eventsText}

LUO UUTISKIRJE SEURAAVILLA OSIOILLA:

1. **OTSIKKO** (subject line, 50-70 merkkiä, houkutteleva)
2. **JOHDANTO** (1-2 kappaletta, luo tunnelmaa ja innostusta)
3. **TAPAHTUMAKORTIT** (jokaiselle tapahtumalle oma osio, 2-3 lausetta per tapahtuma)
4. **CTA-LOPPUOSA** (Call-to-action: rohkaise varaamaan pöytä, seuraamaan somessa, tms.)

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
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY puuttuu')
    }

    const anthropic = new Anthropic({ apiKey })

    console.log('Generating newsletter variants with Claude AI...')

    // Generoi 3 eri versiota rinnakkain
    const variantPromises = [0, 1, 2].map(async (index) => {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        temperature: 0.7 + (index * 0.15), // Vähän eri temperature jokaiselle
        messages: [{
          role: 'user',
          content: prompt
        }],
        system: `Olet luova markkinointisisällön kirjoittaja Kirkkopuiston Terassille.
Luo houkuttelevia uutiskirjeitä jotka saavat ihmiset innostumaan tapahtumista.
Vastaa AINA JSON-muodossa. Älä lisää markdown-muotoilua tai muuta tekstiä, vain puhdas JSON.`
      })

      const textContent = response.content.find(block => block.type === 'text')
      let contentText = textContent?.text || '{}'

      // Poista mahdolliset markdown code block -merkit
      contentText = contentText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

      try {
        const parsed = JSON.parse(contentText)
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
            cta: 'Varaa pöytä ja tule nauttimaan! 🎵'
          },
          usage: response.usage,
          parseError: true
        }
      }
    })

    const variants = await Promise.all(variantPromises)

    console.log('Generated variants:', variants.length)

    // Generoi HTML-esikatselu valitulle variantille
    const selectedContent = variants[selectedVariant]?.content || variants[0]?.content

    const html = generateNewsletterHTML(selectedContent, events, startDate, endDate)

    // Jos pyydetään lähettämään sähköpostit
    if (sendEmails) {
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('*')
        .not('email', 'is', null)

      if (teamError) throw teamError

      if (!teamMembers || teamMembers.length === 0) {
        return res.status(400).json({
          error: 'Ei vastaanottajia. Lisää tiimin jäsenille sähköpostiosoitteet.'
        })
      }

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
    console.error('Newsletter generation error:', error)
    res.status(500).json({
      error: error.message,
      details: error.toString()
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
