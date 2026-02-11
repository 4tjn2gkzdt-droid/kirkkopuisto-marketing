import { withCorsAndErrorHandling, AppError, ErrorTypes } from '../../lib/errorHandler'
import {
  fetchEventsByIds,
  fetchTeamMembers,
  generateNewsletterVariants,
  generateNewsletterHTML,
  sendNewsletterEmail
} from '../../lib/api/newsletterService'
import { supabaseAdmin } from '../../lib/supabase-admin'

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

  console.log('=== GENERATE-NEWSLETTER API CALLED ===')

  if (!supabaseAdmin) {
    throw new AppError(
      'Supabase ei ole konfiguroitu',
      ErrorTypes.SERVER_ERROR,
      { help: 'Tarkista NEXT_PUBLIC_SUPABASE_URL ja SUPABASE_SERVICE_ROLE_KEY environment-muuttujat' }
    )
  }

  const {
    tone = 'casual',
    sendEmails = false,
    selectedVariant = 0,
    selectedEventIds = []
  } = req.body

  console.log('Newsletter generation request:', {
    selectedEventIds,
    tone,
    sendEmails,
    selectedVariant
  })

  // Validoi että tapahtumia on valittu
  if (!selectedEventIds || selectedEventIds.length === 0) {
    throw new AppError(
      'Valitse vähintään yksi tapahtuma',
      ErrorTypes.VALIDATION
    )
  }

  // Hae tapahtumat
  const events = await fetchEventsByIds(selectedEventIds)

  console.log(`Found ${events.length} events`)

  // Laske aikavälä
  const eventDates = events.map(e => new Date(e.date)).sort((a, b) => a - b)
  const startDate = eventDates[0].toISOString().split('T')[0]
  const endDate = eventDates[eventDates.length - 1].toISOString().split('T')[0]

  console.log('Date range:', startDate, '-', endDate)

  // Generoi newsletter-variantit
  const variants = await generateNewsletterVariants(events, tone, 1) // Vain 1 variantti toistaiseksi

  console.log(`Generated ${variants.length} variants`)

  // Valitse variantti
  const selectedContent = variants[selectedVariant]?.content || variants[0]?.content

  if (!selectedContent) {
    throw new AppError(
      'Newsletter-sisällön luominen epäonnistui',
      ErrorTypes.SERVER_ERROR
    )
  }

  // Generoi HTML
  const html = generateNewsletterHTML(selectedContent, events, startDate, endDate)

  // Jos pyydetään lähettämään sähköpostit
  if (sendEmails) {
    console.log('Sending emails...')

    const teamMembers = await fetchTeamMembers()

    if (!teamMembers || teamMembers.length === 0) {
      throw new AppError(
        'Ei vastaanottajia',
        ErrorTypes.VALIDATION,
        { help: 'Lisää tiimin jäsenille sähköpostiosoitteet' }
      )
    }

    const emailResults = await sendNewsletterEmail(
      selectedContent.subject,
      html,
      teamMembers
    )

    return res.status(200).json({
      success: true,
      sent: true,
      emailsSent: emailResults.sent,
      emailsFailed: emailResults.failed,
      recipients: teamMembers,
      events,
      variants,
      selectedVariant,
      results: emailResults.results
    })
  }

  // Palauta esikatselu
  return res.status(200).json({
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
}

export default withCorsAndErrorHandling(handler)
