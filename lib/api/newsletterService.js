/**
 * Newsletter service
 * Abstraktoi uutiskirjeen luomisen ja lähettämisen logiikan
 */

import { supabaseAdmin } from '../supabase-admin'
import { Resend } from 'resend'
import { createClaudeMessage, SystemPrompts } from './claudeService'
import { validateArray, validateRequired, AppError, ErrorTypes } from '../errorHandler'

/**
 * Luo Resend clientin
 */
export function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey || apiKey === 'your_resend_api_key_here') {
    throw new AppError(
      'RESEND_API_KEY puuttuu tai on placeholder-arvo',
      ErrorTypes.AUTHENTICATION,
      { help: 'Aseta oikea API-avain .env.local tiedostoon' }
    )
  }

  return new Resend(apiKey)
}

/**
 * Hae tapahtumat ID:n perusteella
 */
export async function fetchEventsByIds(eventIds) {
  validateArray(eventIds, 'eventIds', 1)

  console.log('Fetching events by IDs:', eventIds)

  const { data: events, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .in('id', eventIds)
    .order('date', { ascending: true })

  if (error) {
    console.error('Supabase error:', error)
    throw new AppError(
      'Tietokantavirhe tapahtumien haussa',
      ErrorTypes.DATABASE_ERROR,
      { originalError: error.message, errorCode: error.code }
    )
  }

  if (!events || events.length === 0) {
    console.log('No events found for IDs:', eventIds)
    throw new AppError(
      'Valittuja tapahtumia ei löytynyt tietokannasta',
      ErrorTypes.NOT_FOUND,
      { selectedEventIds: eventIds }
    )
  }

  return events
}

/**
 * Hae tiimin jäsenet
 */
export async function fetchTeamMembers() {
  const { data: teamMembers, error } = await supabaseAdmin
    .from('team_members')
    .select('*')
    .eq('status', 'active')

  if (error) {
    throw new AppError(
      'Virhe tiimin jäsenten haussa',
      ErrorTypes.DATABASE_ERROR,
      { originalError: error.message }
    )
  }

  return teamMembers || []
}

/**
 * Sävyjen ohjeet
 */
const TONE_INSTRUCTIONS = {
  casual: 'Käytä rentoa, leikkisää ja helposti lähestyttävää sävyä. Sinutellaan lukijaa.',
  formal: 'Käytä ammattitaitoista, asiallista mutta lämmintä sävyä. Sinutellaan lukijaa.',
  energetic: 'Käytä energistä, innostavaa ja positiivista sävyä. Sinutellaan lukijaa.'
}

/**
 * Luo newsletter prompt
 */
function createNewsletterPrompt(events, tone = 'casual') {
  const eventDates = events.map(e => new Date(e.date)).sort((a, b) => a - b)
  const startDate = eventDates[0].toISOString().split('T')[0]
  const endDate = eventDates[eventDates.length - 1].toISOString().split('T')[0]

  // Muotoile tapahtumat AI:lle
  const eventsText = events.map(event => {
    const eventDate = new Date(event.date)
    const dateStr = eventDate.toLocaleDateString('fi-FI', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
    return `- ${dateStr}: ${event.title}${event.artist ? ` - ${event.artist}` : ''}${event.summary ? `\n  Kuvaus: ${event.summary}` : ''}`
  }).join('\n')

  return `Luo houkutteleva uutiskirje Kirkkopuiston Terassin tulevista tapahtumista.

TYYLI: ${TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.casual}
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
}

/**
 * Generoi newsletter-variantti
 */
async function generateNewsletterVariant(events, tone, temperature) {
  const prompt = createNewsletterPrompt(events, tone)

  const systemPrompt = `Olet luova markkinointisisällön kirjoittaja Kirkkopuiston Terassille.
Luo houkuttelevia uutiskirjeitä jotka saavat ihmiset innostumaan tapahtumista.
TÄRKEÄÄ: Kirkkopuistossa ei voi varata pöytiä eikä sinne myydä lippuja. Älä mainitse näitä koskaan.
Sinuttele lukijaa aina. Ole leikkisä mutta vältä liikaa imelyyttä.
Vastaa AINA JSON-muodossa. Älä lisää markdown-muotoilua tai muuta tekstiä, vain puhdas JSON.`

  try {
    const result = await createClaudeMessage({
      message: prompt,
      systemPrompt,
      model: 'claude-sonnet-4-5-20250929',
      maxTokens: 2048,
      temperature
    })

    // Poista mahdolliset markdown code block -merkit
    let contentText = result.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    try {
      const parsed = JSON.parse(contentText)
      return {
        content: parsed,
        usage: result.usage
      }
    } catch (parseError) {
      console.error('Failed to parse newsletter JSON:', contentText)

      // Palauta fallback
      return {
        content: {
          subject: `Tulevat tapahtumat Kirkkopuiston Terassilla`,
          intro: `Katso mitä jännittävää on tulossa!`,
          events: events.map(e => ({
            title: e.title,
            date: new Date(e.date).toLocaleDateString('fi-FI'),
            description: e.summary || 'Tule mukaan!'
          })),
          cta: 'Tule nauttimaan upeista tapahtumista! 🎵'
        },
        usage: result.usage,
        parseError: true
      }
    }
  } catch (error) {
    console.error('Newsletter variant generation error:', error)
    throw error
  }
}

/**
 * Generoi useita newsletter-variantteja
 */
export async function generateNewsletterVariants(events, tone = 'casual', variantCount = 3) {
  console.log(`Generating ${variantCount} newsletter variants...`)

  const variantPromises = Array.from({ length: variantCount }, (_, index) =>
    generateNewsletterVariant(events, tone, 0.7 + (index * 0.15))
  )

  const results = await Promise.all(variantPromises)

  return results.map((result, index) => ({
    variant: index + 1,
    ...result
  }))
}

/**
 * Generoi HTML-newsletter
 */
export function generateNewsletterHTML(content, events, startDate, endDate) {
  const dateRange = `${new Date(startDate).toLocaleDateString('fi-FI')} - ${new Date(endDate).toLocaleDateString('fi-FI')}`

  return `
<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.subject}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #4CAF50;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #4CAF50;
      margin: 0;
      font-size: 28px;
    }
    .date-range {
      color: #666;
      font-size: 14px;
      margin-top: 10px;
    }
    .intro {
      font-size: 16px;
      margin-bottom: 30px;
      line-height: 1.8;
    }
    .event {
      background-color: #f9f9f9;
      border-left: 4px solid #4CAF50;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 5px;
    }
    .event h2 {
      color: #4CAF50;
      margin-top: 0;
      font-size: 20px;
    }
    .event-date {
      color: #666;
      font-size: 14px;
      margin-bottom: 10px;
      font-weight: bold;
    }
    .event-description {
      font-size: 15px;
      line-height: 1.6;
    }
    .cta {
      background-color: #4CAF50;
      color: white;
      padding: 20px;
      border-radius: 5px;
      text-align: center;
      margin-top: 30px;
      font-size: 16px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌳 Kirkkopuiston Terassi</h1>
      <div class="date-range">${dateRange}</div>
    </div>

    <div class="intro">
      ${content.intro}
    </div>

    ${content.events.map(event => `
      <div class="event">
        <h2>${event.title}</h2>
        <div class="event-date">${event.date}</div>
        <div class="event-description">${event.description}</div>
      </div>
    `).join('')}

    <div class="cta">
      ${content.cta}
    </div>

    <div class="footer">
      <p>Kirkkopuiston Terassi, Turku</p>
      <p>Seuraa meitä sosiaalisessa mediassa! 📱</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Lähetä newsletter sähköpostilla
 */
export async function sendNewsletterEmail(subject, html, recipients) {
  validateRequired(subject, 'subject')
  validateRequired(html, 'html')
  validateArray(recipients, 'recipients', 1)

  const resend = createResendClient()

  console.log(`Sending newsletter to ${recipients.length} recipients...`)

  const emailPromises = recipients.map(async (member) => {
    if (!member.email) {
      console.warn('Skipping member without email:', member.name)
      return { success: false, email: 'missing', error: 'Email missing' }
    }

    try {
      const result = await resend.emails.send({
        from: 'Kirkkopuiston Terassi <noreply@kirkkopuisto.fi>',
        to: member.email,
        subject: subject,
        html: html
      })

      console.log(`Email sent to ${member.email}:`, result)

      return {
        success: true,
        email: member.email,
        name: member.name,
        messageId: result.id
      }
    } catch (error) {
      console.error(`Failed to send email to ${member.email}:`, error)

      return {
        success: false,
        email: member.email,
        name: member.name,
        error: error.message
      }
    }
  })

  const results = await Promise.all(emailPromises)

  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  return {
    sent: successful,
    failed: failed,
    results: results
  }
}

/**
 * Tallenna newsletter-luonnos
 */
export async function saveNewsletterDraft(content, events, userId) {
  const { data, error } = await supabaseAdmin
    .from('newsletter_drafts')
    .insert({
      subject: content.subject,
      content: content,
      events: events.map(e => e.id),
      created_by: userId,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new AppError(
      'Virhe luonnoksen tallennuksessa',
      ErrorTypes.DATABASE_ERROR,
      { originalError: error.message }
    )
  }

  return data
}
