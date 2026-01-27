import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { socialPostTypes, socialChannels } from '../lib/constants'

// Apufunktio: Parsii YYYY-MM-DD stringin paikalliseksi Date-objektiksi (ei UTC)
// Välttää aikavyöhykeongelmia, joissa päivämäärä siirtyy päivällä
function parseLocalDate(dateString) {
  if (!dateString) return new Date()
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

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

  // Somepostauksen lisäysmodaali
  const [showAddSocialPostModal, setShowAddSocialPostModal] = useState(false)
  const [newSocialPost, setNewSocialPost] = useState({
    title: '',
    date: '',
    time: '12:00',
    type: 'viikko-ohjelma',
    channels: [],
    assignee: '',
    linkedEventId: null,
    status: 'suunniteltu',
    caption: '',
    notes: '',
    mediaLinks: [],
    recurrence: 'none',
    recurrenceEndDate: ''
  })

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

  const saveSocialPost = async () => {
    if (!newSocialPost.title || !newSocialPost.date) {
      alert('Täytä vähintään otsikko ja päivämäärä')
      return
    }

    try {
      const year = parseInt(newSocialPost.date.split('-')[0])

      const { data, error } = await supabase
        .from('social_media_posts')
        .insert({
          title: newSocialPost.title,
          date: newSocialPost.date,
          time: newSocialPost.time,
          year: year,
          type: newSocialPost.type,
          channels: newSocialPost.channels,
          status: newSocialPost.status,
          caption: newSocialPost.caption,
          notes: newSocialPost.notes,
          created_by_id: user.id,
          created_by_email: user.email,
          created_by_name: user.user_metadata?.full_name || user.email
        })
        .select()

      if (error) throw error

      alert('✅ Somepostaus lisätty!')

      // Sulje modaali ja tyhjennä lomake
      setShowAddSocialPostModal(false)
      setNewSocialPost({
        title: '',
        date: '',
        time: '12:00',
        type: 'viikko-ohjelma',
        channels: [],
        assignee: '',
        linkedEventId: null,
        status: 'suunniteltu',
        caption: '',
        notes: '',
        mediaLinks: [],
        recurrence: 'none',
        recurrenceEndDate: ''
      })

    } catch (error) {
      console.error('Error saving social post:', error)
      alert('Virhe tallennuksessa: ' + error.message)
    }
  }

  const openAddPostModal = (content) => {
    // Esitäytä lomake generoidulla sisällöllä
    const today = new Date()
    const defaultDate = today.toISOString().split('T')[0]

    setNewSocialPost({
      title: currentTemplate?.name || 'Uusi postaus',
      date: defaultDate,
      time: '12:00',
      type: 'muu',
      channels: ['instagram'],
      assignee: '',
      linkedEventId: null,
      status: 'suunniteltu',
      caption: content || generatedContent,
      notes: `Luotu sisältömallista: ${currentTemplate?.name || ''}`,
      mediaLinks: [],
      recurrence: 'none',
      recurrenceEndDate: ''
    })

    // Avaa modaali
    setShowAddSocialPostModal(true)
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
                            {parseLocalDate(event.date).toLocaleDateString('fi-FI')}
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

                {/* "Lisää somepäivitys" -nappi */}
                <button
                  onClick={() => openAddPostModal(generatedContent)}
                  className="w-full py-3 px-4 rounded-lg font-semibold transition bg-green-600 hover:bg-green-700 text-white mt-3"
                >
                  ➕ Lisää somepäivitys
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Somepostauksen lisäysmodaali */}
      {showAddSocialPostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">📱 Lisää somepostaus</h3>

            <div className="space-y-4">
              {/* Otsikko */}
              <div>
                <label className="block text-sm font-semibold mb-2">Otsikko *</label>
                <input
                  type="text"
                  value={newSocialPost.title}
                  onChange={(e) => setNewSocialPost({ ...newSocialPost, title: e.target.value })}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="Esim. Viikon ohjelma vko 24"
                />
              </div>

              {/* Päivämäärä ja aika */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Julkaisupäivä *</label>
                  <input
                    type="date"
                    value={newSocialPost.date}
                    onChange={(e) => setNewSocialPost({ ...newSocialPost, date: e.target.value })}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Julkaisuaika</label>
                  <input
                    type="time"
                    value={newSocialPost.time}
                    onChange={(e) => setNewSocialPost({ ...newSocialPost, time: e.target.value })}
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tyyppi */}
              <div>
                <label className="block text-sm font-semibold mb-2">Postauksen tyyppi *</label>
                <select
                  value={newSocialPost.type}
                  onChange={(e) => setNewSocialPost({ ...newSocialPost, type: e.target.value })}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  {socialPostTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kanavat */}
              <div>
                <label className="block text-sm font-semibold mb-2">Somekanavat</label>
                <div className="flex flex-wrap gap-2">
                  {socialChannels.map(channel => (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => {
                        const isSelected = newSocialPost.channels.includes(channel.id);
                        setNewSocialPost({
                          ...newSocialPost,
                          channels: isSelected
                            ? newSocialPost.channels.filter(c => c !== channel.id)
                            : [...newSocialPost.channels, channel.id]
                        });
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        newSocialPost.channels.includes(channel.id)
                          ? 'bg-indigo-600 text-white shadow'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {channel.icon} {channel.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold mb-2">Status</label>
                <select
                  value={newSocialPost.status}
                  onChange={(e) => setNewSocialPost({ ...newSocialPost, status: e.target.value })}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                >
                  <option value="suunniteltu">📋 Suunniteltu</option>
                  <option value="työn alla">⏳ Työn alla</option>
                  <option value="valmis">✅ Valmis</option>
                  <option value="julkaistu">🎉 Julkaistu</option>
                </select>
              </div>

              {/* Caption/Teksti */}
              <div>
                <label className="block text-sm font-semibold mb-2">Caption / Postauksen teksti</label>
                <textarea
                  value={newSocialPost.caption}
                  onChange={(e) => setNewSocialPost({ ...newSocialPost, caption: e.target.value })}
                  rows={4}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="Kirjoita postauksen teksti..."
                />
              </div>

              {/* Muistiinpanot */}
              <div>
                <label className="block text-sm font-semibold mb-2">Muistiinpanot</label>
                <textarea
                  value={newSocialPost.notes}
                  onChange={(e) => setNewSocialPost({ ...newSocialPost, notes: e.target.value })}
                  rows={3}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  placeholder="Sisäiset muistiinpanot..."
                />
              </div>

              {/* Kuvien/medioiden linkit */}
              <div>
                <label className="block text-sm font-semibold mb-2">Kuvat/mediat (URL-linkit)</label>
                {newSocialPost.mediaLinks.map((link, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={link}
                      onChange={(e) => {
                        const updatedLinks = [...newSocialPost.mediaLinks];
                        updatedLinks[index] = e.target.value;
                        setNewSocialPost({ ...newSocialPost, mediaLinks: updatedLinks });
                      }}
                      className="flex-1 p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                      placeholder="https://example.com/kuva.jpg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updatedLinks = newSocialPost.mediaLinks.filter((_, i) => i !== index);
                        setNewSocialPost({ ...newSocialPost, mediaLinks: updatedLinks });
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setNewSocialPost({ ...newSocialPost, mediaLinks: [...newSocialPost.mediaLinks, ''] });
                  }}
                  className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition"
                >
                  ➕ Lisää kuva/media
                </button>
              </div>
            </div>

            {/* Toimintonapit */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveSocialPost}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-bold"
              >
                💾 Tallenna
              </button>
              <button
                onClick={() => {
                  setShowAddSocialPostModal(false);
                  setNewSocialPost({
                    title: '',
                    date: '',
                    time: '12:00',
                    type: 'viikko-ohjelma',
                    channels: [],
                    assignee: '',
                    linkedEventId: null,
                    status: 'suunniteltu',
                    caption: '',
                    notes: '',
                    mediaLinks: [],
                    recurrence: 'none',
                    recurrenceEndDate: ''
                  });
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Peruuta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
