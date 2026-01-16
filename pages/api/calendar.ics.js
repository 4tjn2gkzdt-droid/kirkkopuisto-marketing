import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Hae kaikki tapahtumat ja tehtävät
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        tasks (*)
      `)
      .gte('date', '2024-01-01') // Näytä vain tulevat ja viimeisen vuoden tapahtumat
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      return res.status(500).send('Error generating calendar');
    }

    // Luo iCalendar-syöte
    const icalLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Kirkkopuiston Terassi//Marketing Calendar//FI',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Kirkkopuiston Terassi - Markkinointi',
      'X-WR-TIMEZONE:Europe/Helsinki',
      'X-WR-CALDESC:Tapahtumat ja markkinointitehtävät Kirkkopuiston Terassille',
      ''
    ];

    // Lisää tapahtumat
    events.forEach(event => {
      const eventDate = new Date(event.date);
      let startTime = eventDate;
      let endTime = new Date(eventDate);

      if (event.time) {
        const [hours, minutes] = event.time.split(':');
        startTime = new Date(eventDate);
        startTime.setHours(parseInt(hours), parseInt(minutes), 0);
        endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 3); // Oletetaan 3h kesto
      } else {
        // Koko päivän tapahtuma
        endTime.setDate(endTime.getDate() + 1);
      }

      const formatICalDate = (date, allDay = false) => {
        if (allDay) {
          return date.toISOString().split('T')[0].replace(/-/g, '');
        }
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      };

      icalLines.push('BEGIN:VEVENT');
      icalLines.push(`UID:event-${event.id}@kirkkopuisto-marketing.vercel.app`);

      if (event.time) {
        icalLines.push(`DTSTART:${formatICalDate(startTime)}`);
        icalLines.push(`DTEND:${formatICalDate(endTime)}`);
      } else {
        icalLines.push(`DTSTART;VALUE=DATE:${formatICalDate(startTime, true)}`);
        icalLines.push(`DTEND;VALUE=DATE:${formatICalDate(endTime, true)}`);
      }

      icalLines.push(`SUMMARY:${event.title}`);

      let description = `Tapahtuma Kirkkopuiston Terassilla`;
      if (event.artist) {
        description += `\\nArtisti: ${event.artist}`;
      }
      if (event.tasks && event.tasks.length > 0) {
        description += `\\n\\nMarkkinointitehtäviä: ${event.tasks.length} kpl`;
      }
      icalLines.push(`DESCRIPTION:${description}`);

      icalLines.push(`LOCATION:Kirkkopuiston Terassi\\, Turku`);
      icalLines.push('STATUS:CONFIRMED');
      icalLines.push('END:VEVENT');
      icalLines.push('');

      // Lisää tehtävät VTODO-tapahtumina (deadlinet)
      if (event.tasks) {
        event.tasks.forEach(task => {
          if (task.due_date && !task.completed) {
            const dueDate = new Date(task.due_date);

            if (task.due_time) {
              const [hours, minutes] = task.due_time.split(':');
              dueDate.setHours(parseInt(hours), parseInt(minutes), 0);
            } else {
              dueDate.setHours(12, 0, 0); // Oletusaika klo 12:00
            }

            // Deadline-tapahtuma (näkyy kalenterissa)
            icalLines.push('BEGIN:VEVENT');
            icalLines.push(`UID:task-${task.id}@kirkkopuisto-marketing.vercel.app`);
            icalLines.push(`DTSTART:${formatICalDate(dueDate)}`);

            const endDate = new Date(dueDate);
            endDate.setHours(endDate.getHours() + 1);
            icalLines.push(`DTEND:${formatICalDate(endDate)}`);

            icalLines.push(`SUMMARY:⏰ DEADLINE: ${task.title}`);

            let taskDesc = `Markkinointitehtävä: ${event.title}`;
            if (task.channel) {
              const channelNames = {
                instagram: 'Instagram',
                facebook: 'Facebook',
                tiktok: 'TikTok',
                newsletter: 'Uutiskirje',
                print: 'Printit',
                'ts-meno': 'TS Menovinkit',
                'turku-calendar': 'Turun kalenteri'
              };
              taskDesc += `\\nKanava: ${channelNames[task.channel] || task.channel}`;
            }
            if (task.assignee) {
              taskDesc += `\\nVastuussa: ${task.assignee}`;
            }
            if (task.content) {
              taskDesc += `\\n\\nSisältö: ${task.content.substring(0, 200)}...`;
            }
            icalLines.push(`DESCRIPTION:${taskDesc}`);

            icalLines.push('CATEGORIES:Markkinointi,Deadline');

            // Väri: punainen lähestyville deadlineille
            const now = new Date();
            const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            if (daysUntil <= 3) {
              icalLines.push('STATUS:CONFIRMED');
              icalLines.push('PRIORITY:1'); // Korkea prioriteetti
            } else {
              icalLines.push('STATUS:TENTATIVE');
              icalLines.push('PRIORITY:5'); // Normaali prioriteetti
            }

            icalLines.push('END:VEVENT');
            icalLines.push('');
          }
        });
      }
    });

    icalLines.push('END:VCALENDAR');

    const icalContent = icalLines.join('\r\n');

    // Aseta headerit iCalendar-tiedostolle
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="kirkkopuisto-marketing.ics"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.status(200).send(icalContent);

  } catch (error) {
    console.error('Error generating calendar:', error);
    res.status(500).send('Error generating calendar');
  }
}
