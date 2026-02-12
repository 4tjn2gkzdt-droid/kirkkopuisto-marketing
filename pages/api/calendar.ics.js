import { supabase } from '../../lib/supabase';
import cors from '../../lib/cors';

// Apufunktio: Parsii YYYY-MM-DD stringin paikalliseksi Date-objektiksi (ei UTC)
function parseLocalDate(dateString) {
  if (!dateString) return new Date()
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// Muotoilee Date-objektin YYYY-MM-DD muotoon paikallisessa ajassa
function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Muotoilee Date-objektin iCalendar-muotoon paikallisessa ajassa
function formatICalDateLocal(date, allDay = false) {
  if (allDay) {
    return formatLocalDate(date).replace(/-/g, '')
  }
  // Aikaleimalliset tapahtumat: käytä paikallista aikaa TZID:n kanssa
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}T${hours}${minutes}${seconds}`
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Lue suodattimet query parametreistä
    const includeEvents = req.query.includeEvents !== 'false';
    const includeSocial = req.query.includeSocial !== 'false';
    const includeTasks = req.query.includeTasks !== 'false';

    let events = [];
    let socialPosts = [];

    // Hae tapahtumat jos valittu
    if (includeEvents) {
      const { data, error } = await supabase
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
      events = data || [];
    }

    // Hae somepostaukset jos valittu
    if (includeSocial) {
      const { data, error } = await supabase
        .from('social_posts')
        .select('*')
        .gte('date', '2024-01-01')
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching social posts:', error);
        // Jatka ilman somepostauksia
      } else {
        socialPosts = data || [];
      }
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
      const eventDate = parseLocalDate(event.date);
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

      icalLines.push('BEGIN:VEVENT');
      icalLines.push(`UID:event-${event.id}@kirkkopuisto-marketing.vercel.app`);

      if (event.time) {
        icalLines.push(`DTSTART;TZID=Europe/Helsinki:${formatICalDateLocal(startTime)}`);
        icalLines.push(`DTEND;TZID=Europe/Helsinki:${formatICalDateLocal(endTime)}`);
      } else {
        icalLines.push(`DTSTART;VALUE=DATE:${formatICalDateLocal(startTime, true)}`);
        icalLines.push(`DTEND;VALUE=DATE:${formatICalDateLocal(endTime, true)}`);
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

      // Lisää tehtävät VTODO-tapahtumina (deadlinet) jos valittu
      if (includeTasks && event.tasks) {
        event.tasks.forEach(task => {
          if (task.due_date && !task.completed) {
            const dueDate = parseLocalDate(task.due_date);

            if (task.due_time) {
              const [hours, minutes] = task.due_time.split(':');
              dueDate.setHours(parseInt(hours), parseInt(minutes), 0);
            } else {
              dueDate.setHours(12, 0, 0); // Oletusaika klo 12:00
            }

            // Deadline-tapahtuma (näkyy kalenterissa)
            icalLines.push('BEGIN:VEVENT');
            icalLines.push(`UID:task-${task.id}@kirkkopuisto-marketing.vercel.app`);
            icalLines.push(`DTSTART;TZID=Europe/Helsinki:${formatICalDateLocal(dueDate)}`);

            const endDate = new Date(dueDate);
            endDate.setHours(endDate.getHours() + 1);
            icalLines.push(`DTEND;TZID=Europe/Helsinki:${formatICalDateLocal(endDate)}`);

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

    // Lisää somepostaukset
    socialPosts.forEach(post => {
      const postDate = parseLocalDate(post.date);
      let startTime = postDate;
      let endTime = new Date(postDate);

      if (post.time) {
        const [hours, minutes] = post.time.split(':');
        startTime = new Date(postDate);
        startTime.setHours(parseInt(hours), parseInt(minutes), 0);
        endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 1); // 1h kesto
      } else {
        // Koko päivän tapahtuma
        endTime.setDate(endTime.getDate() + 1);
      }

      // Somepostauksen tyypit
      const socialPostTypes = {
        'viikko-ohjelma': '📅 Viikko-ohjelma',
        'kuukausiohjelma': '📆 Kuukausiohjelma',
        'artisti-animaatio': '🎬 Artisti-animaatio',
        'artisti-karuselli': '📸 Artisti-karuselli',
        'fiilistelypostaus': '✨ Fiilistelypostaus',
        'tapahtuma-muistutus': '⏰ Tapahtuma-muistutus',
        'kilpailu': '🎁 Kilpailu',
        'muu': '📝 Muu'
      };

      const typeLabel = socialPostTypes[post.type] || '📝 Somepostaus';

      icalLines.push('BEGIN:VEVENT');
      icalLines.push(`UID:social-${post.id}@kirkkopuisto-marketing.vercel.app`);

      if (post.time) {
        icalLines.push(`DTSTART;TZID=Europe/Helsinki:${formatICalDateLocal(startTime)}`);
        icalLines.push(`DTEND;TZID=Europe/Helsinki:${formatICalDateLocal(endTime)}`);
      } else {
        icalLines.push(`DTSTART;VALUE=DATE:${formatICalDateLocal(startTime, true)}`);
        icalLines.push(`DTEND;VALUE=DATE:${formatICalDateLocal(endTime, true)}`);
      }

      icalLines.push(`SUMMARY:📱 ${typeLabel}: ${post.title}`);

      let description = `Somepostaus: ${typeLabel}`;
      if (post.channels && post.channels.length > 0) {
        const channelNames = {
          instagram: 'Instagram',
          facebook: 'Facebook',
          tiktok: 'TikTok',
          linkedin: 'LinkedIn',
          twitter: 'Twitter/X'
        };
        const channelList = post.channels.map(ch => channelNames[ch] || ch).join(', ');
        description += `\\nKanavat: ${channelList}`;
      }
      if (post.assignee) {
        description += `\\nVastuussa: ${post.assignee}`;
      }
      if (post.status) {
        const statusLabels = {
          'suunniteltu': '📋 Suunniteltu',
          'työn alla': '⏳ Työn alla',
          'valmis': '✅ Valmis',
          'julkaistu': '🎉 Julkaistu'
        };
        description += `\\nStatus: ${statusLabels[post.status] || post.status}`;
      }
      if (post.caption) {
        const shortCaption = post.caption.substring(0, 200);
        description += `\\n\\nKuvateksti: ${shortCaption}${post.caption.length > 200 ? '...' : ''}`;
      }
      icalLines.push(`DESCRIPTION:${description}`);

      icalLines.push(`LOCATION:Kirkkopuiston Terassi\\, Turku`);
      icalLines.push('CATEGORIES:SoMe,Markkinointi');

      // Status ja prioriteetti
      const statusMap = {
        'suunniteltu': 'TENTATIVE',
        'työn alla': 'TENTATIVE',
        'valmis': 'CONFIRMED',
        'julkaistu': 'CONFIRMED'
      };
      icalLines.push(`STATUS:${statusMap[post.status] || 'TENTATIVE'}`);

      icalLines.push('END:VEVENT');
      icalLines.push('');
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

export default cors(handler);
