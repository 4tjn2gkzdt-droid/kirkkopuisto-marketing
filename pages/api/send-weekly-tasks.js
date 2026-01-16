import { supabase } from '../../lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Tarkista onko kyseessä esikatselu vai oikea lähetys
  const { sendEmails = false } = req.body

  try {
    // Laske viikon alku ja loppu
    const today = new Date()
    const currentDayOfWeek = today.getDay()
    const daysToMonday = (currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1)
    const monday = new Date(today)
    monday.setDate(today.getDate() - daysToMonday)
    monday.setHours(0, 0, 0, 0)

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    // Hae tapahtumat ja tehtävät
    const year = new Date().getFullYear()
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`*, tasks (*)`)
      .eq('year', year)
      .order('date', { ascending: true })

    if (eventsError) {
      throw eventsError
    }

    // Hae tiimin jäsenet sähköposteilla
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select('*')
      .not('email', 'is', null)

    if (teamError) {
      throw teamError
    }

    // Kerää kaikki tehtävät tältä viikolta
    const thisWeekTasks = []
    events.forEach(event => {
      (event.tasks || []).forEach(task => {
        if (!task.completed && task.due_date) {
          const dueDate = new Date(task.due_date)
          if (dueDate >= monday && dueDate <= sunday) {
            thisWeekTasks.push({
              event: event.title,
              task: task.title,
              deadline: dueDate.toLocaleDateString('fi-FI'),
              time: task.due_time || '',
              assignee: task.assignee || 'Ei määritetty',
              channel: task.channel
            })
          }
        }
      })
    })

    // Järjestä deadlinen mukaan
    thisWeekTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline))

    // Generoi HTML
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(to right, #16a34a, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px; }
    .task { background: #f9fafb; border-left: 4px solid #16a34a; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .urgent { border-left-color: #ef4444; background: #fee2e2; }
    .task-title { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
    .task-details { font-size: 14px; color: #666; }
    .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Viikon työtehtävät</h1>
      <p>Kirkkopuiston Terassi</p>
      <p>${monday.toLocaleDateString('fi-FI')} - ${sunday.toLocaleDateString('fi-FI')}</p>
    </div>

    <div style="padding: 20px;">
      <h2>Hei!</h2>
      <p>Tässä tämän viikon työtehtävät. Yhteensä ${thisWeekTasks.length} tehtävää odottaa tekemistä.</p>

      ${thisWeekTasks.length === 0 ? `
        <div style="text-align: center; padding: 40px;">
          <p style="font-size: 48px;">🎉</p>
          <p>Ei tehtäviä tällä viikolla!</p>
        </div>
      ` : thisWeekTasks.map(task => {
        const deadline = new Date(task.deadline)
        const isUrgent = (deadline - new Date()) / (1000 * 60 * 60 * 24) <= 2

        return `
          <div class="task ${isUrgent ? 'urgent' : ''}">
            <div class="task-title">${task.task}</div>
            <div class="task-details">
              📅 ${task.event}<br>
              🕐 Deadline: ${task.deadline} ${task.time ? `klo ${task.time}` : ''}<br>
              👤 ${task.assignee}<br>
              📢 ${task.channel}
            </div>
          </div>
        `
      }).join('')}
    </div>

    <div class="footer">
      <p>Tämä on automaattinen viikkoraportti Kirkkopuiston Terassin markkinointikalenterista.</p>
      <p>Tulostettu: ${new Date().toLocaleDateString('fi-FI')} ${new Date().toLocaleTimeString('fi-FI')}</p>
    </div>
  </div>
</body>
</html>
    `

    // Jos pyydetään lähettämään sähköpostit
    if (sendEmails) {
      if (!teamMembers || teamMembers.length === 0) {
        return res.status(400).json({
          error: 'Ei vastaanottajia. Lisää tiimin jäsenille sähköpostiosoitteet.'
        })
      }

      // Lähetä sähköposti jokaiselle tiimin jäsenelle
      const emailPromises = teamMembers.map(member =>
        resend.emails.send({
          from: 'Kirkkopuiston Terassi <onboarding@resend.dev>', // Vaihda tämä omaan domainiin kun se on varmennettu
          to: member.email,
          subject: `Viikon työtehtävät (${monday.toLocaleDateString('fi-FI')} - ${sunday.toLocaleDateString('fi-FI')})`,
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
        taskCount: thisWeekTasks.length,
        weekStart: monday.toLocaleDateString('fi-FI'),
        weekEnd: sunday.toLocaleDateString('fi-FI')
      })
    }

    // Muutoin palauta vain esikatselu
    res.status(200).json({
      success: true,
      sent: false,
      html,
      recipients: teamMembers,
      taskCount: thisWeekTasks.length,
      weekStart: monday.toLocaleDateString('fi-FI'),
      weekEnd: sunday.toLocaleDateString('fi-FI')
    })
  } catch (error) {
    console.error('Virhe:', error)
    res.status(500).json({ error: error.message })
  }
}
