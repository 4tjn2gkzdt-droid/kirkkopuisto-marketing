import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

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
    return today.toISOString().split('T')[0]
  }

  const getDefaultEndDate = () => {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return date.toISOString().split('T')[0]
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

  useEffect(() => {
    checkUser()
    loadTeamMembers()
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

  const loadAvailableEvents = async () => {
    setLoadingEvents(true)
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (!error && data) {
        setAvailableEvents(data)
        // Valitse automaattisesti kaikki tapahtumat
        setSelectedEventIds(data.map(e => e.id))
      }
    } catch (error) {
      console.error('Error loading events:', error)
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
      alert('Valitse vähintään yksi tapahtuma korostettavaksi!')
      return
    }

    setGenerating(true)
    setVariants([])
    setPreviewHtml('')
    setShowPreview(false)

    try {
      const response = await fetch('/api/generate-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
          tone,
          sendEmails: false,
          selectedEventIds
        })
      })

      const data = await response.json()

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
      const response = await fetch('/api/generate-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
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
      const response = await fetch('/api/generate-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate,
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
            <div className="text-sm text-gray-600">
              {user?.email}
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
                💡 Valitse vapaa aikaväli uutiskirjeelle - voit tehdä uutiskirjeitä mihin tahansa tulevaisuuteen
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

        {/* Variantit */}
        {variants.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              📝 AI loi {variants.length} versiota
            </h2>

            {dateRange && (
              <p className="text-sm text-gray-600 mb-4">
                Aikaväli: {dateRange.start} - {dateRange.end} | Korostetut: {selectedEventIds.length} | Yhteensä: {events.length}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
              <h3 className="font-semibold text-lg mb-4">
                Valittu: Versio {variants[selectedVariant]?.variant}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📧 Sähköpostin otsikko
                  </label>
                  <p className="text-gray-900 font-semibold">
                    {variants[selectedVariant]?.content.subject}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📝 Johdanto
                  </label>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {variants[selectedVariant]?.content.intro}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ⭐ Korostetut tapahtumat ({variants[selectedVariant]?.content.events?.length || 0})
                  </label>
                  <div className="space-y-3">
                    {variants[selectedVariant]?.content.events?.map((event, i) => (
                      <div key={i} className="bg-white p-3 rounded border border-gray-200">
                        <h4 className="font-semibold text-gray-900">{event.title}</h4>
                        <p className="text-sm text-gray-600">{event.date}</p>
                        <p className="text-sm text-gray-700 mt-2">{event.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📢 Call-to-Action
                  </label>
                  <p className="text-gray-700">
                    {variants[selectedVariant]?.content.cta}
                  </p>
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

              <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
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
        )}
      </div>
    </div>
  )
}
