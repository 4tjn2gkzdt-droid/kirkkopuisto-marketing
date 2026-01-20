import { supabase } from '../../lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import cors from '../../lib/cors'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { startDate, endDate } = req.body

  try {
    const start = startDate ? new Date(startDate) : new Date()
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Hae tapahtumat
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*, tasks (*)')
      .gte('date', start.toISOString().split('T')[0])
      .lte('date', end.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (eventsError) throw eventsError

    // Hae somepostaukset
    const { data: socialPosts, error: socialError } = await supabase
      .from('social_media_posts')
      .select('*')
      .gte('date', start.toISOString().split('T')[0])
      .lte('date', end.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (socialError) throw socialError

    // Analysoi sisältötarpeet
    const contentGaps = analyzeContentGaps(events, socialPosts, start, end)

    // Generoi AI-ehdotukset
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      // Jos ei API-avainta, palauta vain gap-analyysi ilman AI-ehdotuksia
      return res.status(200).json({
        success: true,
        contentGaps,
        aiSuggestions: [],
        message: 'API-avain puuttuu, AI-ehdotukset eivät käytössä'
      })
    }

    const anthropic = new Anthropic({ apiKey })

    // Luo yhteenveto tilanteesta AI:lle
    const summary = `SISÄLTÖKALENTERIN ANALYYSI (${start.toLocaleDateString('fi-FI')} - ${end.toLocaleDateString('fi-FI')}):

TAPAHTUMAT (${events.length} kpl):
${events.map(e => `- ${new Date(e.date).toLocaleDateString('fi-FI')}: ${e.title}${e.artist ? ` (${e.artist})` : ''}`).join('\n')}

SOMEPOSTAUKSET (${socialPosts.length} kpl):
${socialPosts.map(p => `- ${new Date(p.date).toLocaleDateString('fi-FI')}: ${p.title} (${p.type}, status: ${p.status})`).join('\n')}

PUUTTEET:
${contentGaps.map(gap => `- ${gap.type}: ${gap.description}`).join('\n')}

ANNA 5-8 KONKREETTISTA SISÄLTÖEHDOTUSTA:
- Milloin julkaista
- Mitä julkaista
- Mihin kanavaan
- Miksi juuri nyt
- Luo KOLME eri pituista caption-versiota jokaiselle ehdotukselle:
  * short: Lyhyt, napakka versio (1-2 lausetta)
  * medium: Keskipitkä versio (2-4 lausetta)
  * long: Pitkä, yksityiskohtainen versio (5-8 lausetta)

Muotoile JSON:
{
  "suggestions": [
    {
      "date": "2024-01-15",
      "type": "Viikko-ohjelma",
      "channel": "Instagram",
      "reason": "Maanantai-aamuna viikon avaus",
      "priority": "high/medium/low",
      "captions": {
        "short": "Lyhyt caption-teksti tähän",
        "medium": "Keskipitkä caption-teksti tähän",
        "long": "Pitkä caption-teksti tähän"
      }
    }
  ]
}`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: summary
      }],
      system: `Olet sisältöstrategisti Kirkkopuiston Terassille.
Analysoit sisältökalenteria ja ehdotat sisältöä.
Vastaa AINA JSON-muodossa.`
    })

    const textContent = response.content.find(block => block.type === 'text')
    let contentText = textContent?.text || '{}'
    contentText = contentText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let aiSuggestions = []
    try {
      const parsed = JSON.parse(contentText)
      aiSuggestions = parsed.suggestions || []
    } catch (parseError) {
      console.error('Failed to parse AI suggestions:', parseError)
      aiSuggestions = []
    }

    res.status(200).json({
      success: true,
      contentGaps,
      aiSuggestions,
      events,
      socialPosts
    })

  } catch (error) {
    console.error('Content calendar error:', error)
    res.status(500).json({
      error: error.message,
      details: error.toString()
    })
  }
}

// Apufunktio: Analysoi sisältöpuutteet
function analyzeContentGaps(events, socialPosts, startDate, endDate) {
  const gaps = []

  // Tarkista viikko-ohjelmat
  const weeks = getWeeksInRange(startDate, endDate)
  weeks.forEach(week => {
    const weekPosts = socialPosts.filter(p => {
      const postDate = new Date(p.date)
      return postDate >= week.start && postDate <= week.end && p.type === 'viikko-ohjelma'
    })

    if (weekPosts.length === 0) {
      gaps.push({
        type: 'missing-weekly-program',
        description: `Viikko-ohjelma puuttuu viikolle ${week.start.toLocaleDateString('fi-FI')}`,
        date: week.start,
        priority: 'high'
      })
    }
  })

  // Tarkista tapahtumien markkinointi
  events.forEach(event => {
    const eventDate = new Date(event.date)
    const twoDaysBefore = new Date(eventDate)
    twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)

    // Onko last-minute markkinointia?
    const lastMinutePosts = socialPosts.filter(p => {
      const postDate = new Date(p.date)
      return postDate >= twoDaysBefore && postDate < eventDate && p.linked_event_id === event.id
    })

    if (lastMinutePosts.length === 0 && eventDate > new Date()) {
      gaps.push({
        type: 'missing-last-minute',
        description: `Last minute -markkinointi puuttuu: ${event.title}`,
        date: twoDaysBefore,
        priority: 'medium',
        eventId: event.id
      })
    }

    // Onko thank you -postaus tapahtuman jälkeen?
    const oneDayAfter = new Date(eventDate)
    oneDayAfter.setDate(oneDayAfter.getDate() + 1)

    const thankYouPosts = socialPosts.filter(p => {
      const postDate = new Date(p.date)
      return postDate > eventDate && postDate <= oneDayAfter && p.linked_event_id === event.id
    })

    if (thankYouPosts.length === 0 && eventDate < new Date()) {
      gaps.push({
        type: 'missing-thank-you',
        description: `Kiitos-postaus puuttuu: ${event.title}`,
        date: oneDayAfter,
        priority: 'low',
        eventId: event.id
      })
    }
  })

  // Tarkista onko pitkiä hiljaisia jaksoja (yli 3 päivää ilman postauksia)
  const sortedPosts = [...socialPosts].sort((a, b) => new Date(a.date) - new Date(b.date))
  for (let i = 0; i < sortedPosts.length - 1; i++) {
    const currentDate = new Date(sortedPosts[i].date)
    const nextDate = new Date(sortedPosts[i + 1].date)
    const daysDiff = Math.ceil((nextDate - currentDate) / (1000 * 60 * 60 * 24))

    if (daysDiff > 3) {
      const middleDate = new Date(currentDate)
      middleDate.setDate(middleDate.getDate() + Math.floor(daysDiff / 2))

      gaps.push({
        type: 'long-silence',
        description: `${daysDiff} päivän hiljainen jakso`,
        date: middleDate,
        priority: 'medium'
      })
    }
  }

  return gaps
}

// Apufunktio: Hae viikot aikaväliltä
function getWeeksInRange(startDate, endDate) {
  const weeks = []
  let currentDate = new Date(startDate)

  // Siirry viikon alkuun (maanantai)
  const dayOfWeek = currentDate.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  currentDate.setDate(currentDate.getDate() - daysToMonday)

  while (currentDate <= endDate) {
    const weekStart = new Date(currentDate)
    const weekEnd = new Date(currentDate)
    weekEnd.setDate(weekEnd.getDate() + 6)

    weeks.push({
      start: weekStart,
      end: weekEnd
    })

    currentDate.setDate(currentDate.getDate() + 7)
  }

  return weeks
}

export default cors(handler)
