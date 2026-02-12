import { supabase } from '../../lib/supabase'
import cors from '../../lib/cors'

const formatLocalDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)

    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const weekAgo = new Date(today)
    weekAgo.setDate(today.getDate() - 7)

    // Hae tapahtumat seuraavalle viikolle
    const { data: upcomingEvents, error: eventsError } = await supabase
      .from('events')
      .select('*, tasks (*)')
      .gte('date', formatLocalDate(today))
      .lte('date', formatLocalDate(nextWeek))
      .order('date', { ascending: true })

    if (eventsError) throw eventsError

    // Hae somepostaukset viimeiseltä viikolta
    const { data: recentPosts, error: postsError } = await supabase
      .from('social_media_posts')
      .select('*')
      .gte('date', formatLocalDate(weekAgo))
      .order('date', { ascending: false })

    if (postsError) throw postsError

    const alerts = []

    // 1. Tarkista onko tulevia tapahtumia ilman markkinointia
    upcomingEvents.forEach(event => {
      const eventDate = new Date(event.date)
      const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24))

      // Onko tehtäviä määritelty?
      if (!event.tasks || event.tasks.length === 0) {
        alerts.push({
          type: 'no-tasks',
          severity: 'high',
          title: `Tapahtumalle ei ole määritelty tehtäviä`,
          description: `${event.title} (${daysUntil} päivän päästä) ei ole yhtään markkinointitehtävää`,
          actionText: 'Lisää tehtäviä',
          actionLink: '/',
          eventId: event.id,
          date: event.date
        })
      }

      // Onko keskeneräisiä tehtäviä lähellä?
      if (daysUntil <= 2 && event.tasks) {
        const incompleteTasks = event.tasks.filter(t => !t.completed)
        if (incompleteTasks.length > 0) {
          alerts.push({
            type: 'incomplete-tasks',
            severity: daysUntil <= 1 ? 'high' : 'medium',
            title: `${incompleteTasks.length} keskeneräistä tehtävää`,
            description: `${event.title} on ${daysUntil} päivän päästä ja sillä on vielä ${incompleteTasks.length} tekemätöntä tehtävää`,
            actionText: 'Katso tehtävät',
            actionLink: '/',
            eventId: event.id,
            date: event.date
          })
        }
      }

      // Onko last minute -markkinointia tehty?
      if (daysUntil <= 1) {
        const hasLastMinute = event.tasks?.some(t =>
          t.title.toLowerCase().includes('last minute') ||
          t.title.toLowerCase().includes('viime hetki')
        )

        if (!hasLastMinute) {
          alerts.push({
            type: 'no-last-minute',
            severity: 'medium',
            title: 'Last minute -markkinointi puuttuu',
            description: `${event.title} on ${daysUntil === 0 ? 'tänään' : 'huomenna'} - nyt olisi hyvä aika viime hetken markkinointiin!`,
            actionText: 'Luo last minute -postaus',
            actionLink: '/mallit',
            eventId: event.id,
            date: event.date
          })
        }
      }
    })

    // 2. Tarkista somekanavien aktiivisuus
    const channels = ['instagram', 'facebook', 'tiktok']

    channels.forEach(channel => {
      const channelPosts = recentPosts.filter(p =>
        p.channels && Array.isArray(p.channels) && p.channels.includes(channel)
      )

      if (channelPosts.length === 0) {
        alerts.push({
          type: 'channel-silence',
          severity: 'medium',
          title: `${channel.charAt(0).toUpperCase() + channel.slice(1)} on ollut hiljainen`,
          description: `Ei yhtään postausta viimeiseen viikkoon`,
          actionText: 'Luo postaus',
          actionLink: '/mallit',
          channel
        })
      } else {
        // Tarkista viimeisimmän postauksen päivä
        const latestPost = channelPosts[0]
        const latestDate = new Date(latestPost.date)
        const daysSince = Math.ceil((today - latestDate) / (1000 * 60 * 60 * 24))

        if (daysSince >= 4) {
          alerts.push({
            type: 'channel-quiet',
            severity: 'low',
            title: `${channel.charAt(0).toUpperCase() + channel.slice(1)} on ollut hiljainen ${daysSince} päivää`,
            description: `Viimeisin postaus oli ${daysSince} päivää sitten`,
            actionText: 'Luo postaus',
            actionLink: '/mallit',
            channel
          })
        }
      }
    })

    // 3. Tarkista viikko-ohjelma tälle viikolle
    const monday = new Date(today)
    const dayOfWeek = today.getDay()
    const daysToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
    monday.setDate(today.getDate() - daysToMonday)

    const thisWeekPosts = recentPosts.filter(p => {
      const postDate = new Date(p.date)
      return postDate >= monday && p.type === 'viikko-ohjelma'
    })

    if (thisWeekPosts.length === 0 && dayOfWeek <= 2) { // Maanantai tai tiistai
      alerts.push({
        type: 'no-weekly-program',
        severity: 'high',
        title: 'Viikko-ohjelma puuttuu',
        description: 'Tämän viikon viikko-ohjelmaa ei ole vielä julkaistu',
        actionText: 'Luo viikko-ohjelma',
        actionLink: '/mallit'
      })
    }

    // 4. Tarkista tulevat tapahtumat ilman sisältöä
    upcomingEvents.forEach(event => {
      if (event.tasks) {
        const tasksWithoutContent = event.tasks.filter(t => !t.content || t.content.trim() === '')
        if (tasksWithoutContent.length > 0) {
          const eventDate = new Date(event.date)
          const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24))

          alerts.push({
            type: 'missing-content',
            severity: daysUntil <= 3 ? 'high' : 'low',
            title: `${tasksWithoutContent.length} tehtävää ilman sisältöä`,
            description: `${event.title} (${daysUntil} päivän päästä) - ${tasksWithoutContent.length} tehtävää ei ole sisältöä`,
            actionText: 'Generoi sisältö',
            actionLink: '/',
            eventId: event.id,
            date: event.date
          })
        }
      }
    })

    // Järjestä severity mukaan: high -> medium -> low
    const severityOrder = { high: 0, medium: 1, low: 2 }
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    res.status(200).json({
      success: true,
      alerts,
      summary: {
        total: alerts.length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
      }
    })

  } catch (error) {
    console.error('Content alerts error:', error)
    res.status(500).json({
      error: error.message,
      details: error.toString()
    })
  }
}

export default cors(handler)
