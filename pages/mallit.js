import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function ContentTemplates() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [customData, setCustomData] = useState({})
  const [generatedContent, setGeneratedContent] = useState('')
  const [events, setEvents] = useState([])
  const [selectedEvents, setSelectedEvents] = useState([])

  // Template-määritykset
  const templates = [
    {
      id: 'top-3-events',
      name: 'Viikon TOP 3 tapahtumat 🌟',
      description: 'Valitse ja korosta viikon kolme parasta tapahtumaa',
      icon: '🏆',
      color: 'from-yellow-400 to-orange-500',
      fields: ['events'],
      needsEvents: true
    },
    {
      id: 'meet-the-artist',
      name: 'Meet the Artist 🎤',
      description: 'Esittele artisti ja luo kiinnostusta',
      icon: '🎸',
      color: 'from-purple-400 to-pink-500',
      fields: ['artistName', 'eventDate', 'genre', 'bio']
    },
    {
      id: 'behind-the-scenes',
      name: 'Behind the Scenes 🎬',
      description: 'Näytä kulissien takana -sisältöä',
      icon: '🎥',
      color: 'from-blue-400 to-cyan-500',
      fields: ['topic', 'context']
    },
    {
      id: 'customer-story',
      name: 'Asiakastarina 💬',
      description: 'Muuta asiakaspalaute tarinaksi',
      icon: '⭐',
      color: 'from-green-400 to-emerald-500',
      fields: ['feedback', 'eventName', 'customerName']
    },
    {
      id: 'weather-based',
      name: 'Säähän perustuva 🌤️',
      description: 'Luo sisältöä sään mukaan',
      icon: '☀️',
      color: 'from-amber-400 to-yellow-500',
      fields: ['weather', 'temperature', 'weekday', 'upcomingEvent']
    },
    {
      id: 'throwback',
      name: 'Throwback / Nostalgia 📸',
      description: 'Muistellaan menneitä tapahtumia',
      icon: '⏮️',
      color: 'from-indigo-400 to-purple-500',
      fields: ['eventName', 'eventDate', 'description']
    },
    {
      id: 'last-minute',
      name: 'Last Minute ⏰',
      description: 'Kiireellinen "viime hetken liput" -viesti',
      icon: '🔥',
      color: 'from-red-400 to-pink-500',
      fields: ['eventName', 'eventTime', 'artist', 'availability']
    },
    {
      id: 'thank-you',
      name: 'Kiitos-postaus 🙏',
      description: 'Kiitä osallistujia tapahtuman jälkeen',
      icon: '💚',
      color: 'from-teal-400 to-green-500',
      fields: ['eventName', 'artist', 'highlights']
    }
  ]

  // Field labels
  const fieldLabels = {
    artistName: 'Artistin nimi',
    eventDate: 'Tapahtuman päivämäärä',
    genre: 'Genre / Tyyli',
    bio: 'Artistin tausta (valinnainen)',
    topic: 'Aihe',
    context: 'Konteksti / Tilanne',
    feedback: 'Asiakaspalaute',
    eventName: 'Tapahtuman nimi',
    customerName: 'Asiakkaan nimi (valinnainen)',
    weather: 'Sää (aurinkoinen, sateinen, viileä...)',
    temperature: 'Lämpötila',
    weekday: 'Viikonpäivä',
    upcomingEvent: 'Tuleva tapahtuma (valinnainen)',
    description: 'Kuvaus',
    eventTime: 'Tapahtuman aika',
    artist: 'Artisti',
    availability: 'Paikkojen tilanne',
    highlights: 'Illan kohokohdat (valinnainen)'
  }

  useEffect(() => {
    checkUser()
    loadEvents()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
    setLoading(false)
  }

  const loadEvents = async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date', today.toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(20)

    if (!error && data) {
      setEvents(data)
    }
  }

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      alert('Valitse mallipohja')
      return
    }

    setGenerating(true)
    setGeneratedContent('')

    try {
      const template = templates.find(t => t.id === selectedTemplate)

      // Jos tarvitaan tapahtumia
      let eventsData = []
      if (template.needsEvents && selectedEvents.length > 0) {
        eventsData = events.filter(e => selectedEvents.includes(e.id))
      }

      const response = await fetch('/api/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType: selectedTemplate,
          customData,
          events: eventsData
        })
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedContent(data.content)
      } else {
        alert('Virhe generoinnissa: ' + (data.error || 'Tuntematon virhe'))
      }
    } catch (error) {
      console.error('Error generating template:', error)
      alert('Virhe generoinnissa: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent)
    alert('📋 Kopioitu leikepöydälle!')
  }

  const resetForm = () => {
    setSelectedTemplate(null)
    setCustomData({})
    setGeneratedContent('')
    setSelectedEvents([])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Ladataan...</div>
      </div>
    )
  }

  const currentTemplate = templates.find(t => t.id === selectedTemplate)

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
                📝 Sisältömallit
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
          <h3 className="font-semibold text-blue-900 mb-2">✨ Smart Content Templates</h3>
          <p className="text-sm text-blue-800">
            Valitse valmis mallipohja, täytä tiedot, ja AI luo valmiin sisällön! Nämä mallit on optimoitu
            erilaisiin tilanteisiin ja säästävät aikaa sisällöntuotannossa.
          </p>
        </div>

        {!selectedTemplate ? (
          /* Template-valinta */
          <div>
            <h2 className="text-xl font-semibold mb-4">Valitse mallipohja</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`p-6 rounded-lg shadow-sm hover:shadow-md transition text-left bg-gradient-to-br ${template.color} text-white`}
                >
                  <div className="text-4xl mb-3">{template.icon}</div>
                  <h3 className="font-bold text-lg mb-2">{template.name}</h3>
                  <p className="text-sm opacity-90">{template.description}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Template-lomake */
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {currentTemplate.icon} {currentTemplate.name}
                  </h2>
                  <p className="text-gray-600">{currentTemplate.description}</p>
                </div>
                <button
                  onClick={resetForm}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ← Vaihda mallia
                </button>
              </div>

              {/* Tapahtumavalinta jos tarvitaan */}
              {currentTemplate.needsEvents && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valitse tapahtumat (max 3)
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {events.slice(0, 10).map(event => (
                      <label key={event.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(event.id)}
                          onChange={(e) => {
                            if (e.target.checked && selectedEvents.length < 3) {
                              setSelectedEvents([...selectedEvents, event.id])
                            } else if (!e.target.checked) {
                              setSelectedEvents(selectedEvents.filter(id => id !== event.id))
                            }
                          }}
                          disabled={!selectedEvents.includes(event.id) && selectedEvents.length >= 3}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{event.title}</div>
                          <div className="text-sm text-gray-600">
                            {new Date(event.date).toLocaleDateString('fi-FI')}
                            {event.artist && ` - ${event.artist}`}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Kentät */}
              <div className="space-y-4">
                {currentTemplate.fields.map(field => {
                  if (field === 'events') return null // Skip, handled above

                  return (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {fieldLabels[field] || field}
                      </label>
                      {field === 'feedback' || field === 'bio' || field === 'description' || field === 'highlights' ? (
                        <textarea
                          value={customData[field] || ''}
                          onChange={(e) => setCustomData({ ...customData, [field]: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          rows={3}
                          placeholder={`Syötä ${fieldLabels[field]?.toLowerCase() || field}`}
                        />
                      ) : field === 'eventDate' ? (
                        <input
                          type="date"
                          value={customData[field] || ''}
                          onChange={(e) => setCustomData({ ...customData, [field]: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      ) : (
                        <input
                          type="text"
                          value={customData[field] || ''}
                          onChange={(e) => setCustomData({ ...customData, [field]: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder={`Syötä ${fieldLabels[field]?.toLowerCase() || field}`}
                        />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Generoi-nappi */}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className={`mt-6 w-full py-3 px-6 rounded-lg font-semibold text-white transition ${
                  generating
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {generating ? '🤖 Generoidaan...' : '✨ Luo sisältö'}
              </button>
            </div>

            {/* Generoitu sisältö */}
            {generatedContent && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">📄 Generoitu sisältö</h3>

                <div className="bg-gray-50 p-4 rounded-lg mb-4 whitespace-pre-wrap">
                  {generatedContent}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={copyToClipboard}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
                  >
                    📋 Kopioi leikepöydälle
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
                  >
                    🔄 Generoi uudelleen
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
