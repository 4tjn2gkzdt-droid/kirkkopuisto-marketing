import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import MediaSuggestions from '../components/MediaSuggestions'

// Apufunktio aikavyöhykeongelmien välttämiseksi
const formatLocalDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function NewsletterGenerator() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(false)

  // Asetukset
  const [tone, setTone] = useState('casual')

  // Päivämäärävalinta - oletuksena tänään ja 7 päivää eteenpäin
  const getDefaultStartDate = () => {
    const today = new Date()
    return formatLocalDate(today)
  }

  const getDefaultEndDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return formatLocalDate(date)
  }

  const [startDate, setStartDate] = useState(getDefaultStartDate())
  const [endDate, setEndDate] = useState(getDefaultEndDate())

  // Tapahtumat
  const [availableEvents, setAvailableEvents] = useState([])
  const [selectedEventIds, setSelectedEventIds] = useState([])

  // Generoidut variantit
  const [variants, setVariants] = useState([])
  const [selectedVariant, setSelectedVariant] = useState(0)
  const [previewHtml, setPreviewHtml] = useState('')
  const [events, setEvents] = useState([])
  const [dateRange, setDateRange] = useState(null)

  // UI state
  const [showPreview, setShowPreview] = useState(false)
  const [teamMembers, setTeamMembers] = useState([])
  const [copySuccess, setCopySuccess] = useState(false)

  // Muokkaus-state
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(null)

  // Luonnosten tallennus
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [drafts, setDrafts] = useState([])
  const [loadingDrafts, setLoadingDrafts] = useState(false)
  const [showDraftsPanel, setShowDraftsPanel] = useState(false)

  useEffect(() => {
    checkUser()
    loadTeamMembers()
    suggestNextEventMonth()
    loadDrafts()
  }, [])

  useEffect(() => {
    if (user) {
      loadAvailableEvents()
    }
  }, [startDate, endDate, user])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
    setLoading(false)
  }

  const loadTeamMembers = async () => {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .not('email', 'is', null)

    if (!error && data) {
      setTeamMembers(data)
    }
  }

  const loadDrafts = async () => {
    setLoadingDrafts(true)
    try {
      const { data, error } = await supabase
        .from('newsletter_drafts')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setDrafts(data)
      }
    } catch (error) {
      console.error('Error loading drafts:', error)
    } finally {
      setLoadingDrafts(false)
    }
  }

  const saveDraft = async () => {
    if (!draftName.trim()) {
      alert('Anna luonnokselle nimi')
      return
    }

    if (variants.length === 0) {
      alert('Ei tallennettavaa sisältöä')
      return
    }

    try {
      const draftData = {
        name: draftName,
        content: variants[selectedVariant].content,
        selected_event_ids: selectedEventIds,
        tone: tone,
        html: previewHtml
      }

      const { data, error } = await supabase
        .from('newsletter_drafts')
        .insert([draftData])
        .select()

      if (error) throw error

      alert('✅ Luonnos tallennettu!')
      setDraftName('')
      setShowSaveDialog(false)
      loadDrafts()
    } catch (error) {
      console.error('Error saving draft:', error)
      alert('Virhe tallennuksessa: ' + error.message)
    }
  }

  const loadDraft = async (draft) => {
    try {
      // Lataa valitut tapahtumat
      if (draft.selected_event_ids && draft.selected_event_ids.length > 0) {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .in('id', draft.selected_event_ids)
          .order('date', { ascending: true })

        if (!eventError && eventData) {
          setEvents(eventData)
          setSelectedEventIds(draft.selected_event_ids)
        }
      }

      // Aseta sisältö
      setVariants([{
        variant: 1,
        content: draft.content
      }])
      setSelectedVariant(0)
      setPreviewHtml(draft.html)
      setTone(draft.tone)

      setShowDraftsPanel(false)
      alert('✅ Luonnos ladattu!')
    } catch (error) {
      console.error('Error loading draft:', error)
      alert('Virhe ladattaessa: ' + error.message)
    }
  }

  const deleteDraft = async (draftId) => {
    if (!confirm('Haluatko varmasti poistaa luonnoksen?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('newsletter_drafts')
        .delete()
        .eq('id', draftId)

      if (error) throw error

      alert('✅ Luonnos poistettu')
      loadDrafts()
    } catch (error) {
      console.error('Error deleting draft:', error)
      alert('Virhe poistossa: ' + error.message)
    }
  }

  const suggestNextEventMonth = async () => {
    try {
      const today = new Date()
      const todayStr = formatLocalDate(today)

      console.log('Searching for next month with events starting from:', todayStr)

      // Hae seuraavat tapahtumat
      const { data: upcomingEvents, error } = await supabase
        .from('events')
        .select('date')
        .gte('date', todayStr)
        .order('date', { ascending: true })
        .limit(50)

      console.log('Found upcoming events:', upcomingEvents?.length || 0, upcomingEvents?.slice(0, 5))

      if (error || !upcomingEvents || upcomingEvents.length === 0) {
        console.log('No upcoming events found, using default dates')
        return
      }

      // Ryhmittele tapahtumat kuukauden mukaan
      const eventsByMonth = {}
      upcomingEvents.forEach(event => {
        const eventDate = new Date(event.date)
        const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`
        if (!eventsByMonth[monthKey]) {
          eventsByMonth[monthKey] = []
        }
        eventsByMonth[monthKey].push(event)
      })

      console.log('Events grouped by month:', Object.keys(eventsByMonth).map(key => ({
        month: key,
        count: eventsByMonth[key].length
      })))

      // Löydä ensimmäinen kuukausi jossa on tapahtumia
      const months = Object.keys(eventsByMonth).sort()
      if (months.length === 0) {
        console.log('No months with events found')
        return
      }

      const suggestedMonth = months[0]
      const [year, month] = suggestedMonth.split('-').map(Number)

      // Aseta aikaväli kuukauden alkuun ja loppuun
      const startOfMonth = new Date(year, month - 1, 1)
      const endOfMonth = new Date(year, month, 0)

      const suggestedStartDate = formatLocalDate(startOfMonth)
      const suggestedEndDate = formatLocalDate(endOfMonth)

      console.log('Suggesting month:', suggestedMonth, 'with', eventsByMonth[suggestedMonth].length, 'events')
      console.log('Date range:', suggestedStartDate, '-', suggestedEndDate)

      setStartDate(suggestedStartDate)
      setEndDate(suggestedEndDate)
    } catch (error) {
      console.error('Error suggesting event month:', error)
      // Käytä oletusarvoja virhetilanteessa
    }
  }

  const loadAvailableEvents = async () => {
    setLoadingEvents(true)
    try {
      console.log('Frontend: Loading events with date range:', {
        startDate,
        endDate,
        startDateType: typeof startDate,
        endDateType: typeof endDate
      })

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      console.log('Frontend: Events query result:', {
        dataLength: data?.length || 0,
        error: error?.message,
        sampleEvent: data?.[0] ? {
          id: data[0].id,
          date: data[0].date,
          dateType: typeof data[0].date,
          title: data[0].title
        } : null
      })

      if (!error && data) {
        setAvailableEvents(data)
        // Valitse automaattisesti kaikki tapahtumat
        setSelectedEventIds(data.map(e => e.id))
      } else if (error) {
        console.error('Error loading events:', error)
        alert('Virhe tapahtumien latauksessa: ' + error.message)
      }
    } catch (error) {
      console.error('Error loading events:', error)
      alert('Virhe tapahtumien latauksessa: ' + error.message)
    } finally {
      setLoadingEvents(false)
    }
  }

  const toggleEventSelection = (eventId) => {
    setSelectedEventIds(prev => {
      if (prev.includes(eventId)) {
        return prev.filter(id => id !== eventId)
      } else {
        return [...prev, eventId]
      }
    })
  }

  const handleGenerate = async () => {
    if (selectedEventIds.length === 0) {
      alert('Valitse vähintään yksi tapahtuma!')
      return
    }

    console.log('=== FRONTEND: Newsletter generation request ===')
    console.log('Selected event IDs:', selectedEventIds)
    console.log('IDs count:', selectedEventIds.length)
    console.log('IDs types:', selectedEventIds.map(id => typeof id))
    console.log('First 3 IDs:', selectedEventIds.slice(0, 3))
    console.log('Tone:', tone)

    setGenerating(true)
    setVariants([])
    setPreviewHtml('')
    setShowPreview(false)

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone,
          sendEmails: false,
          selectedEventIds
        })
      })

      console.log('=== FRONTEND: Response received ===')
      console.log('Status:', response.status)
      console.log('Status text:', response.statusText)
      console.log('Content-Type:', response.headers.get('content-type'))

      // Tarkista että vastaus on OK
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Server error response:', errorText)

        // Näytä eri virheviestit eri statuksille
        let errorMessage = `Virhe (${response.status} ${response.statusText}): `
        if (response.status === 405) {
          errorMessage += 'Method Not Allowed. API-kutsu hylätty. Tämä saattaa johtua CORS-ongelmasta.'
        } else if (response.status === 500) {
          errorMessage += 'Palvelinvirhe. ' + errorText.substring(0, 200)
        } else if (response.status === 400) {
          errorMessage += 'Virheellinen pyyntö. ' + errorText.substring(0, 200)
        } else {
          errorMessage += errorText.substring(0, 200)
        }

        throw new Error(errorMessage)
      }

      // Tarkista että vastaus on JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text()
        console.error('Non-JSON response:', responseText)
        throw new Error(`Palvelin palautti väärän tyyppisen vastauksen: ${contentType}. Vastaus: ${responseText.substring(0, 200)}`)
      }

      const data = await response.json()

      console.log('=== FRONTEND: API response ===')
      console.log('Success:', data.success)
      console.log('Events found:', data.events?.length || 0)
      console.log('Variants:', data.variants?.length || 0)
      if (data.debug) {
        console.log('Debug info:', data.debug)
      }
      if (data.error) {
        console.error('API error:', data.error)
        console.error('Error details:', data.details)
      }

      if (data.success) {
        if (data.variants && data.variants.length > 0) {
          setVariants(data.variants)
          setPreviewHtml(data.html)
          setEvents(data.events)
          setDateRange(data.dateRange)
          setSelectedVariant(0)
        } else {
          // Näytä yksityiskohtainen virheviesti
          let alertMsg = data.message || 'Ei tapahtumia valitulla aikavälillä'
          if (data.debug) {
            alertMsg += `\n\nDebug-tiedot:\n`
            alertMsg += `Aikaväli: ${data.debug.dateRange}\n`
            alertMsg += `Tapahtumia aikavälillä: ${data.debug.allEventsInRange}\n`
            alertMsg += `Valittuja tapahtumaIDitä: ${data.debug.selectedEventIdsCount}\n`
            if (data.debug.selectedEventIds && data.debug.selectedEventIds.length > 0) {
              alertMsg += `Valitut IDit: ${data.debug.selectedEventIds.join(', ')}`
            }
          }
          alert(alertMsg)
        }
      } else {
        alert('Virhe generoinnissa: ' + (data.error || 'Tuntematon virhe'))
      }
    } catch (error) {
      console.error('Error generating newsletter:', error)
      alert('Virhe generoinnissa: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  const handlePreview = async () => {
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone,
          sendEmails: false,
          selectedVariant,
          selectedEventIds
        })
      })

      const data = await response.json()
      if (data.success) {
        setPreviewHtml(data.html)
        setShowPreview(true)
      }
    } catch (error) {
      console.error('Error previewing:', error)
    }
  }

  const handleSend = async () => {
    if (!confirm(`Lähetetäänkö uutiskirje ${teamMembers.length} vastaanottajalle?`)) {
      return
    }

    setSending(true)

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tone,
          sendEmails: true,
          selectedVariant,
          selectedEventIds
        })
      })

      const data = await response.json()

      if (data.success && data.sent) {
        alert(`✅ Uutiskirje lähetetty!\n\nLähetetty: ${data.emailsSent}\nEpäonnistui: ${data.emailsFailed}`)
      } else {
        alert('Virhe lähetyksessä: ' + (data.error || 'Tuntematon virhe'))
      }
    } catch (error) {
      console.error('Error sending:', error)
      alert('Virhe lähetyksessä: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  const handleCopyHTML = async () => {
    try {
      await navigator.clipboard.writeText(previewHtml)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      console.error('Error copying:', error)
      alert('Virhe kopioinnissa. Kokeile uudelleen.')
    }
  }

  const startEditing = () => {
    setEditedContent(JSON.parse(JSON.stringify(variants[selectedVariant].content)))
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setEditedContent(null)
    setIsEditing(false)
  }

  const saveEdits = () => {
    // Päivitä valittu variantti muokatulla sisällöllä
    const updatedVariants = [...variants]
    updatedVariants[selectedVariant] = {
      ...updatedVariants[selectedVariant],
      content: editedContent
    }
    setVariants(updatedVariants)

    // Generoi uusi HTML päivitetystä sisällöstä
    const startDate = events[0]?.date
    const endDate = events[events.length - 1]?.date
    const html = generateNewsletterHTMLClient(editedContent, events, startDate, endDate)
    setPreviewHtml(html)

    setIsEditing(false)
    setEditedContent(null)
  }

  const updateEditedField = (field, value) => {
    setEditedContent(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updateEditedEvent = (index, field, value) => {
    setEditedContent(prev => ({
      ...prev,
      events: prev.events.map((event, i) =>
        i === index ? { ...event, [field]: value } : event
      )
    }))
  }

  // Client-side HTML generation
  const generateNewsletterHTMLClient = (content, allEvents, startDate, endDate) => {
    // Sama logiikka kuin serverillä
    const eventCards = content.events.map((event) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Ladataan...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-green-600 hover:text-green-700">
                ← Takaisin
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                📧 Uutiskirjegeneraattori
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowDraftsPanel(true)}
                className="px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg transition flex items-center gap-2"
              >
                📁 Luonnokset ({drafts.length})
              </button>
              <div className="text-sm text-gray-600">
                {user?.email}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Ohjeet */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">✨ Miten tämä toimii?</h3>
          <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
            <li>Valitse aikaväli ja uutiskirjeen sävy</li>
            <li>Valitse tapahtumat joita haluat KOROSTAA (yksityiskohtaiset kuvaukset)</li>
            <li>Klikkaa "Generoi uutiskirje" - AI luo 3 eri versiota</li>
            <li>Kaikki aikavälin tapahtumat näkyvät lopussa listana</li>
            <li>Valitse paras versio, esikatsele ja lähetä</li>
          </ol>
        </div>

        {/* Asetukset */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Asetukset</h2>

          <div className="space-y-6">
            {/* Päivämääräväli */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📅 Valitse aikaväli
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Alkupäivä</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Loppupäivä</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Aikaväli on ehdotettu automaattisesti kuukaudelle, jossa on seuraavaksi tapahtumia. Voit muuttaa aikaväliä vapaasti.
              </p>
            </div>

            {/* Sävy */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Uutiskirjeen sävy
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="casual">Rento ja ystävällinen 😊</option>
                <option value="formal">Ammattimainen ja asiallinen 💼</option>
                <option value="energetic">Energinen ja innostava 🚀</option>
              </select>
            </div>
          </div>

          {/* Tapahtumien valinta */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Valitse korostettavat tapahtumat ({selectedEventIds.length}/{availableEvents.length})
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedEventIds(availableEvents.map(e => e.id))}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Valitse kaikki
                </button>
                <button
                  onClick={() => setSelectedEventIds([])}
                  className="text-xs text-gray-600 hover:text-gray-800"
                >
                  Tyhjennä
                </button>
              </div>
            </div>

            {loadingEvents ? (
              <div className="text-center py-8 text-gray-500">Ladataan tapahtumia...</div>
            ) : availableEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Ei tapahtumia valitulla aikavälillä
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
                {availableEvents.map((event) => (
                  <label
                    key={event.id}
                    className={`flex items-start p-4 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 transition ${
                      selectedEventIds.includes(event.id) ? 'bg-green-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEventIds.includes(event.id)}
                      onChange={() => toggleEventSelection(event.id)}
                      className="mt-1 mr-3 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{event.title}</div>
                      <div className="text-sm text-gray-600">
                        📅 {new Date(event.date).toLocaleDateString('fi-FI', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                        {event.time && ` klo ${event.time}`}
                      </div>
                      {event.artist && (
                        <div className="text-sm text-gray-600">🎤 {event.artist}</div>
                      )}
                      {event.summary && (
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {event.summary}
                        </div>
                      )}
                    </div>
                    {selectedEventIds.includes(event.id) && (
                      <span className="text-green-600 text-xl ml-2">✓</span>
                    )}
                  </label>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
              💡 Valitse tapahtumat joista AI kirjoittaa yksityiskohtaiset kuvaukset.
              Kaikki aikavälin tapahtumat näkyvät lisäksi lopussa listana.
            </p>
          </div>

          {/* Vastaanottajat */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Vastaanottajat:</strong> {teamMembers.length} henkilöä
              {teamMembers.length > 0 && (
                <span className="ml-2 text-xs">
                  ({teamMembers.map(m => m.name || m.email).join(', ')})
                </span>
              )}
            </p>
          </div>

          {/* Generoi-nappi */}
          <button
            onClick={handleGenerate}
            disabled={generating || selectedEventIds.length === 0}
            className={`mt-6 w-full py-3 px-6 rounded-lg font-semibold text-white transition ${
              generating || selectedEventIds.length === 0
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {generating ? '🤖 Generoidaan...' : '✨ Generoi uutiskirje'}
          </button>

          {selectedEventIds.length === 0 && (
            <p className="text-sm text-red-600 mt-2">
              ⚠️ Valitse vähintään yksi tapahtuma
            </p>
          )}
        </div>

        {/* Kuvaehdotukset kuvapankista */}
        {selectedEventIds.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <MediaSuggestions
              text={availableEvents.filter(e => selectedEventIds.includes(e.id)).map(e => e.title).join(', ')}
              onSelect={(asset) => {
                navigator.clipboard.writeText(asset.public_url)
                alert(`Kuvan URL kopioitu leikepöydälle!\n${asset.description_fi || asset.file_name}`)
              }}
            />
          </div>
        )}

        {/* Variantit */}
        {variants.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              📝 AI loi {variants.length} {variants.length === 1 ? 'version' : 'versiota'}
            </h2>

            {dateRange && (
              <p className="text-sm text-gray-600 mb-4">
                Aikaväli: {dateRange.start} - {dateRange.end} | Korostetut: {selectedEventIds.length} | Yhteensä: {events.length}
              </p>
            )}

            <div className={`grid grid-cols-1 ${variants.length > 1 ? 'md:grid-cols-3' : ''} gap-4 mb-6`}>
              {variants.map((variant, index) => {
                const content = variant.content
                const isSelected = selectedVariant === index

                return (
                  <div
                    key={index}
                    onClick={() => setSelectedVariant(index)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                      isSelected
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">
                        Versio {variant.variant}
                      </h3>
                      {isSelected && (
                        <span className="text-green-600 text-xl">✓</span>
                      )}
                    </div>

                    <div className="text-sm space-y-2">
                      <div>
                        <span className="font-medium text-gray-700">Otsikko:</span>
                        <p className="text-gray-600 mt-1">{content.subject}</p>
                      </div>

                      <div>
                        <span className="font-medium text-gray-700">Johdanto:</span>
                        <p className="text-gray-600 mt-1 line-clamp-3">
                          {content.intro.substring(0, 150)}...
                        </p>
                      </div>

                      {variant.parseError && (
                        <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                          ⚠️ Käytetään fallback-sisältöä
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Valitun variantin yksityiskohdat */}
            <div className="bg-gray-50 p-6 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">
                  Valittu: Versio {variants[selectedVariant]?.variant}
                </h3>
                {!isEditing ? (
                  <button
                    onClick={startEditing}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition"
                  >
                    ✏️ Muokkaa
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg transition"
                    >
                      Peruuta
                    </button>
                    <button
                      onClick={saveEdits}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition"
                    >
                      💾 Tallenna muutokset
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Otsikko */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📧 Sähköpostin otsikko
                  </label>
                  {!isEditing ? (
                    <p className="text-gray-900 font-semibold">
                      {variants[selectedVariant]?.content.subject}
                    </p>
                  ) : (
                    <input
                      type="text"
                      value={editedContent?.subject || ''}
                      onChange={(e) => updateEditedField('subject', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>

                {/* Johdanto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📝 Johdanto
                  </label>
                  {!isEditing ? (
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {variants[selectedVariant]?.content.intro}
                    </p>
                  ) : (
                    <textarea
                      value={editedContent?.intro || ''}
                      onChange={(e) => updateEditedField('intro', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>

                {/* Korostetut tapahtumat */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ⭐ Korostetut tapahtumat ({(isEditing ? editedContent?.events : variants[selectedVariant]?.content.events)?.length || 0})
                  </label>
                  <div className="space-y-3">
                    {(isEditing ? editedContent?.events : variants[selectedVariant]?.content.events)?.map((event, i) => (
                      <div key={i} className="bg-white p-3 rounded border border-gray-200">
                        {!isEditing ? (
                          <>
                            <h4 className="font-semibold text-gray-900">{event.title}</h4>
                            <p className="text-sm text-gray-600">{event.date}</p>
                            <p className="text-sm text-gray-700 mt-2">{event.description}</p>
                          </>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={event.title}
                              onChange={(e) => updateEditedEvent(i, 'title', e.target.value)}
                              className="w-full px-2 py-1 mb-2 border border-gray-300 rounded font-semibold"
                              placeholder="Tapahtuman nimi"
                            />
                            <input
                              type="text"
                              value={event.date}
                              onChange={(e) => updateEditedEvent(i, 'date', e.target.value)}
                              className="w-full px-2 py-1 mb-2 border border-gray-300 rounded text-sm"
                              placeholder="Päivämäärä"
                            />
                            <textarea
                              value={event.description}
                              onChange={(e) => updateEditedEvent(i, 'description', e.target.value)}
                              rows={3}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              placeholder="Kuvaus"
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📢 Call-to-Action
                  </label>
                  {!isEditing ? (
                    <p className="text-gray-700">
                      {variants[selectedVariant]?.content.cta}
                    </p>
                  ) : (
                    <textarea
                      value={editedContent?.cta || ''}
                      onChange={(e) => updateEditedField('cta', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    💡 Lisäksi kaikki {events.length} tapahtumaa näkyvät lopussa selkeänä listana (nimi, päivä, kellonaika)
                  </p>
                </div>
              </div>
            </div>

            {/* Toiminnot */}
            <div className="flex gap-4">
              <button
                onClick={() => setShowSaveDialog(true)}
                className="py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
              >
                💾 Tallenna luonnos
              </button>

              <button
                onClick={handlePreview}
                className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                👁️ Esikatsele HTML
              </button>

              <button
                onClick={handleSend}
                disabled={sending || teamMembers.length === 0}
                className={`flex-1 py-3 px-6 font-semibold rounded-lg transition ${
                  sending || teamMembers.length === 0
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {sending ? '📤 Lähetetään...' : `📧 Lähetä uutiskirje (${teamMembers.length})`}
              </button>
            </div>

            {teamMembers.length === 0 && (
              <p className="text-sm text-red-600 mt-2">
                ⚠️ Ei vastaanottajia. Lisää tiimin jäseniä ensin.
              </p>
            )}
          </div>
        )}

        {/* Tallennus-dialogi */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">💾 Tallenna luonnos</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anna luonnokselle nimi
                </label>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="esim. Tammikuun uutiskirje"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && saveDraft()}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowSaveDialog(false)
                    setDraftName('')
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Peruuta
                </button>
                <button
                  onClick={saveDraft}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                >
                  Tallenna
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Luonnosten lataus-paneeli */}
        {showDraftsPanel && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold">📁 Tallennetut luonnokset</h3>
                <button
                  onClick={() => setShowDraftsPanel(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-auto p-6">
                {loadingDrafts ? (
                  <div className="text-center py-8 text-gray-500">Ladataan...</div>
                ) : drafts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Ei tallennettuja luonnoksia
                  </div>
                ) : (
                  <div className="space-y-3">
                    {drafts.map((draft) => (
                      <div
                        key={draft.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {draft.name}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">
                              Tallennettu: {new Date(draft.created_at).toLocaleString('fi-FI')}
                            </p>
                            <p className="text-sm text-gray-500">
                              Otsikko: {draft.content?.subject}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => loadDraft(draft)}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition"
                            >
                              Lataa
                            </button>
                            <button
                              onClick={() => deleteDraft(draft.id)}
                              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-sm rounded-lg transition"
                            >
                              Poista
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowDraftsPanel(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Sulje
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HTML-esikatselu */}
        {showPreview && previewHtml && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold">HTML-esikatselu</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 bg-gray-50">
                <div
                  className="bg-white shadow-lg mx-auto"
                  style={{ maxWidth: '600px' }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-between gap-3">
                <button
                  onClick={handleCopyHTML}
                  className={`px-4 py-2 rounded-lg transition ${
                    copySuccess
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  {copySuccess ? '✓ Kopioitu!' : '📋 Kopioi HTML'}
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                  >
                    Sulje
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                  >
                    {sending ? 'Lähetetään...' : 'Lähetä nyt'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
