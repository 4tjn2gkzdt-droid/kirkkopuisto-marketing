import { supabase } from '../../lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import cors from '../../lib/cors'

// Increase timeout for this API route to 60 seconds
export const config = {
  maxDuration: 60, // Vercel Pro: 60s, Hobby: 10s (will use max available)
}

// Apufunktio: Parsii YYYY-MM-DD stringin paikalliseksi Date-objektiksi (ei UTC)
function parseLocalDate(dateString) {
  if (!dateString) return new Date()
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Apufunktio: Muuntaa Date-objektin YYYY-MM-DD stringiksi paikallisessa ajassa
function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { startDate, endDate } = req.body

  try {
    const start = startDate ? parseLocalDate(startDate) : new Date()
    const end = endDate ? parseLocalDate(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Hae tapahtumat
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*, tasks (*)')
      .gte('date', formatLocalDate(start))
      .lte('date', formatLocalDate(end))
      .order('date', { ascending: true })

    if (eventsError) throw eventsError

    // Hae somepostaukset
    const { data: socialPosts, error: socialError } = await supabase
      .from('social_media_posts')
      .select('*')
      .gte('date', formatLocalDate(start))
      .lte('date', formatLocalDate(end))
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
- Mitä julkaista (otsikko)
- Mihin kanavaan
- Miksi juuri nyt (perustelu)
- ÄLÄ luo caption-sisältöä vielä - se luodaan vasta kun käyttäjä valitsee ehdotuksen

Muotoile JSON:
{
  "suggestions": [
    {
      "date": "2024-01-15",
      "type": "Viikko-ohjelma",
      "channel": "Instagram",
      "title": "Napakka otsikko ehdotukselle",
      "reason": "Selkeä perustelu miksi tämä postaus olisi tärkeä juuri nyt",
      "priority": "high/medium/low"
    }
  ]
}`

    let aiSuggestions = []
    let aiErrorMessage = null
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 8192, // Increased to allow for 5-8 suggestions with 3 caption versions each
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

      console.log('AI response (full):', contentText) // Debug log - näytä koko vastaus
      console.log('AI response (preview):', contentText.substring(0, 500)) // Debug log

      // Poista kaikki markdown-koodiblokki-merkinnät (```json, ```, etc.)
      contentText = contentText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

      console.log('After markdown cleanup:', contentText.substring(0, 500)) // Debug log

      // Jos teksti alkaa tai päättyy välilyönneillä tai rivinvaihdoilla, puhdista
      contentText = contentText.trim()

      // Etsi JSON-objekti tekstistä (alkaa { ja päättyy })
      const jsonMatch = contentText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        contentText = jsonMatch[0]
        console.log('JSON object found, length:', contentText.length) // Debug log
      } else {
        console.warn('No JSON object pattern found in text') // Debug log
      }

      let parsed
      try {
        parsed = JSON.parse(contentText)
        console.log('JSON parsed successfully:', parsed) // Debug log
      } catch (parseError) {
        console.error('JSON parse failed:', parseError)
        console.error('Attempted to parse:', contentText)
        aiErrorMessage = `JSON-parsinta epäonnistui: ${parseError.message}. Tarkista Debug-sivulta lisätietoja.`
        throw new Error('AI palautti virheellisen JSON-muodon: ' + parseError.message)
      }

      aiSuggestions = parsed.suggestions || []

      if (!aiSuggestions || aiSuggestions.length === 0) {
        console.warn('AI returned empty suggestions array')
        aiErrorMessage = 'AI palautti tyhjän ehdotuslistan. Tarkista Debug-sivulta lisätietoja.'
      }

      console.log(`AI generated ${aiSuggestions.length} suggestions`) // Debug log
    } catch (aiError) {
      console.error('AI suggestion generation failed:', aiError)
      console.error('Error details:', aiError.message)
      console.error('Error stack:', aiError.stack)

      // Tallenna virheviesti
      if (!aiErrorMessage) {
        if (aiError.status === 401) {
          aiErrorMessage = 'API-avain on virheellinen tai vanhentunut'
        } else if (aiError.status === 429) {
          aiErrorMessage = 'API-rajat ylitetty, yritä hetken kuluttua uudelleen'
        } else if (aiError.status === 500) {
          aiErrorMessage = 'Anthropic API:ssa on sisäinen virhe'
        } else {
          aiErrorMessage = aiError.message || 'Tuntematon virhe AI-ehdotusten generoinnissa'
        }
      }

      // Palauta virhe käyttäjälle mutta älä kaada koko requestia
      aiSuggestions = []
    }

    res.status(200).json({
      success: true,
      contentGaps,
      aiSuggestions,
      events,
      socialPosts,
      aiError: aiErrorMessage // Lisää virheviesti jos AI epäonnistui
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
      const postDate = parseLocalDate(p.date)
      return postDate >= week.start && postDate <= week.end && p.type === 'viikko-ohjelma'
    })

    if (weekPosts.length === 0) {
      gaps.push({
        type: 'missing-weekly-program',
        description: `Viikko-ohjelma puuttuu viikolle ${week.start.toLocaleDateString('fi-FI')}`,
        date: formatLocalDate(week.start),
        priority: 'high'
      })
    }
  })

  // Tarkista tapahtumien markkinointi
  events.forEach(event => {
    const eventDate = parseLocalDate(event.date)
    const twoDaysBefore = new Date(eventDate)
    twoDaysBefore.setDate(twoDaysBefore.getDate() - 2)

    // Onko last-minute markkinointia?
    const lastMinutePosts = socialPosts.filter(p => {
      const postDate = parseLocalDate(p.date)
      return postDate >= twoDaysBefore && postDate < eventDate && p.linked_event_id === event.id
    })

    if (lastMinutePosts.length === 0 && eventDate > new Date()) {
      gaps.push({
        type: 'missing-last-minute',
        description: `Last minute -markkinointi puuttuu: ${event.title}`,
        date: formatLocalDate(twoDaysBefore),
        priority: 'medium',
        eventId: event.id
      })
    }

    // Onko thank you -postaus tapahtuman jälkeen?
    const oneDayAfter = new Date(eventDate)
    oneDayAfter.setDate(oneDayAfter.getDate() + 1)

    const thankYouPosts = socialPosts.filter(p => {
      const postDate = parseLocalDate(p.date)
      return postDate > eventDate && postDate <= oneDayAfter && p.linked_event_id === event.id
    })

    if (thankYouPosts.length === 0 && eventDate < new Date()) {
      gaps.push({
        type: 'missing-thank-you',
        description: `Kiitos-postaus puuttuu: ${event.title}`,
        date: formatLocalDate(oneDayAfter),
        priority: 'low',
        eventId: event.id
      })
    }
  })

  // Tarkista onko pitkiä hiljaisia jaksoja (yli 3 päivää ilman postauksia)
  const sortedPosts = [...socialPosts].sort((a, b) => parseLocalDate(a.date) - parseLocalDate(b.date))
  for (let i = 0; i < sortedPosts.length - 1; i++) {
    const currentDate = parseLocalDate(sortedPosts[i].date)
    const nextDate = parseLocalDate(sortedPosts[i + 1].date)
    const daysDiff = Math.ceil((nextDate - currentDate) / (1000 * 60 * 60 * 24))

    if (daysDiff > 3) {
      const middleDate = new Date(currentDate)
      middleDate.setDate(middleDate.getDate() + Math.floor(daysDiff / 2))

      gaps.push({
        type: 'long-silence',
        description: `${daysDiff} päivän hiljainen jakso`,
        date: formatLocalDate(middleDate),
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
