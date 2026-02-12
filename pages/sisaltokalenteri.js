import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

// Apufunktio aikavyöhykeongelmien välttämiseksi
const formatLocalDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Vakiot somepostauksille
const socialPostTypes = [
  { id: 'viikko-ohjelma', name: 'Viikko-ohjelma', icon: '📅' },
  { id: 'last-minute', name: 'Last minute -markkinointi', icon: '⚡' },
  { id: 'kiitos', name: 'Kiitos-postaus', icon: '🙏' },
  { id: 'teaser', name: 'Teaser', icon: '🎬' },
  { id: 'tiedote', name: 'Tiedote', icon: '📢' },
  { id: 'tarinat', name: 'Tarinat', icon: '📖' },
  { id: 'muu', name: 'Muu sisältö', icon: '📝' }
]

const socialChannels = [
  { id: 'instagram', name: 'Instagram', icon: '📸' },
  { id: 'facebook', name: 'Facebook', icon: '👥' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
  { id: 'newsletter', name: 'Uutiskirje', icon: '📧' }
]

export default function ContentCalendar() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [contentGaps, setContentGaps] = useState([])
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [events, setEvents] = useState([])
  const [socialPosts, setSocialPosts] = useState([])
  const [savingSuggestion, setSavingSuggestion] = useState(null)
  const [expandedSuggestion, setExpandedSuggestion] = useState(null)
  const [editableCaption, setEditableCaption] = useState('')
  const [generatingContent, setGeneratingContent] = useState(null)
  const [generatedCaptions, setGeneratedCaptions] = useState({})

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

  useEffect(() => {
    checkUser()
    // Aseta oletusaikavä li: tästä päivästä 30 päivää eteenpäin
    const today = new Date()
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    setStartDate(formatLocalDate(today))
    setEndDate(formatLocalDate(in30Days))
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

  const handleAnalyze = async () => {
    if (!startDate || !endDate) {
      alert('Valitse aikaväli')
      return
    }

    setAnalyzing(true)
    setContentGaps([])
    setAiSuggestions([])

    try {
      const response = await fetch('/api/content-calendar-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate,
          endDate
        })
      })

      const data = await response.json()

      if (data.success) {
        setContentGaps(data.contentGaps || [])
        setAiSuggestions(data.aiSuggestions || [])
        setEvents(data.events || [])
        setSocialPosts(data.socialPosts || [])

        // Näytä varoitus jos AI-ehdotuksia ei tullut
        if (!data.aiSuggestions || data.aiSuggestions.length === 0) {
          let errorMsg = '⚠️ AI-ehdotuksia ei voitu generoida.\n\n'
          if (data.aiError) {
            errorMsg += 'Virhe: ' + data.aiError + '\n\n'
          } else if (data.message) {
            errorMsg += data.message + '\n\n'
          }
          errorMsg += 'Käy Debug-sivulla (🐛 Debug -nappi ylhäällä) saadaksesi lisätietoja.'
          alert(errorMsg)
        } else if (data.aiError) {
          // AI-ehdotukset saatiin mutta oli virheitä
          alert('⚠️ ' + data.aiError + '\n\nKäy Debug-sivulla saadaksesi lisätietoja.')
        }
      } else {
        alert('Virhe analyysissä: ' + (data.error || 'Tuntematon virhe') + '\n\nKäy Debug-sivulla saadaksesi lisätietoja.')
      }
    } catch (error) {
      console.error('Error analyzing calendar:', error)
      alert('Virhe analyysissä: ' + error.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return '🔴 Kiireellinen'
      case 'medium':
        return '🟡 Keskitärkeä'
      case 'low':
        return '🔵 Matala'
      default:
        return '⚪ Normaali'
    }
  }

  const addSuggestionToCalendar = async (suggestion, customCaption = null) => {
    setSavingSuggestion(suggestion)

    try {
      // Muunna kanavan nimi tietokantamuotoon
      const channelMap = {
        'Instagram': 'instagram',
        'Facebook': 'facebook',
        'TikTok': 'tiktok',
        'Uutiskirje': 'newsletter'
      }

      const channel = channelMap[suggestion.channel] || 'instagram'

      // Käytä customCaption jos annettu, muuten reason
      const captionText = customCaption || suggestion.reason

      // Tallenna myös AI-ehdotukset notes-kenttään
      let notesText = 'Luotu AI-ehdotuksesta'
      if (suggestion.captions) {
        notesText += '\n\n🤖 AI-EHDOTUKSET:\n\n'
        notesText += '📝 LYHYT:\n' + suggestion.captions.short + '\n\n'
        notesText += '📄 KESKIPITKÄ:\n' + suggestion.captions.medium + '\n\n'
        notesText += '📜 PITKÄ:\n' + suggestion.captions.long
      }

      // Ekstraktoi vuosi päivämäärästä
      const year = parseInt(suggestion.date.split('-')[0])

      // Luo uusi somepostaus
      const { data, error } = await supabase
        .from('social_media_posts')
        .insert({
          title: suggestion.type,
          date: suggestion.date,
          time: '12:00',
          year: year,
          type: suggestion.type.toLowerCase().replace(/\s+/g, '-'),
          channels: [channel],
          status: 'suunniteltu',
          caption: captionText,
          notes: notesText,
          created_by_id: user.id,
          created_by_email: user.email,
          created_by_name: user.user_metadata?.full_name || user.email
        })
        .select()

      if (error) throw error

      alert('✅ Ehdotus lisätty kalenteriin!')

      // ÄLÄ poista ehdotusta listasta - käyttäjä haluaa että ne jäävät näkyviin
      // Tyhjennä vain muokattava kenttä
      setEditableCaption('')

    } catch (error) {
      console.error('Error saving suggestion:', error)
      alert('Virhe tallennuksessa: ' + error.message)
    } finally {
      setSavingSuggestion(null)
    }
  }

  const toggleSuggestionExpansion = (suggestion) => {
    if (expandedSuggestion === suggestion) {
      setExpandedSuggestion(null)
      setEditableCaption('')
    } else {
      setExpandedSuggestion(suggestion)
      // Aseta oletuksena medium-versio muokattavaksi
      setEditableCaption(suggestion.captions?.medium || suggestion.reason || '')
    }
  }

  const saveAICaption = (suggestion, captionVersion, index) => {
    // Hae captions joko suggestion-objektista tai generoiduista
    const captions = suggestion.captions || generatedCaptions[index]
    const caption = captions?.[captionVersion] || suggestion.reason
    addSuggestionToCalendar(suggestion, caption)
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

  const openAddPostModal = (suggestion) => {
    // Muunna kanavan nimi tietokantamuotoon
    const channelMap = {
      'Instagram': 'instagram',
      'Facebook': 'facebook',
      'TikTok': 'tiktok',
      'Uutiskirje': 'newsletter'
    }
    const channel = channelMap[suggestion.channel] || 'instagram'

    // Esitäytä lomake suggestion-datalla
    setNewSocialPost({
      title: suggestion.type || suggestion.title || '',
      date: suggestion.date || '',
      time: '12:00',
      type: 'viikko-ohjelma',
      channels: [channel],
      assignee: '',
      linkedEventId: null,
      status: 'suunniteltu',
      caption: '',
      notes: suggestion.reason || '',
      mediaLinks: [],
      recurrence: 'none',
      recurrenceEndDate: ''
    })

    // Avaa modaali
    setShowAddSocialPostModal(true)
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
                🤖 SOME-AI
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
          <h3 className="font-semibold text-blue-900 mb-2">🤖 AI-avusteinen sisältösuunnittelu</h3>
          <p className="text-sm text-blue-800">
            AI analysoi sisältökalenterisi ja tunnistaa puutteet: viikko-ohjelmat, tapahtumien markkinointi,
            kiitos-postaukset ja hiljaiset jaksot. Saat konkreettiset ehdotukset milloin julkaista mitäkin!
          </p>
        </div>

        {/* Aikavälin valinta */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Valitse aikaväli</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Aloituspäivä
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lopetuspäivä
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition ${
              analyzing
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {analyzing ? '🤖 Analysoidaan...' : '🔍 Analysoi sisältökalenteri'}
          </button>
        </div>

        {/* Tulokset */}
        {(contentGaps.length > 0 || aiSuggestions.length > 0) && (
          <div className="space-y-6">
            {/* Yhteenveto */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="text-3xl font-bold text-green-600">{events.length}</div>
                <div className="text-sm text-gray-600">Tapahtumaa</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="text-3xl font-bold text-blue-600">{socialPosts.length}</div>
                <div className="text-sm text-gray-600">Somepostausta</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="text-3xl font-bold text-red-600">{contentGaps.length}</div>
                <div className="text-sm text-gray-600">Puutetta havaittu</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="text-3xl font-bold text-purple-600">{aiSuggestions.length}</div>
                <div className="text-sm text-gray-600">AI-ehdotusta</div>
              </div>
            </div>

            {/* Sisältöpuutteet */}
            {contentGaps.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-semibold mb-4">⚠️ Tunnistetut puutteet</h3>
                <div className="space-y-3">
                  {contentGaps.sort((a, b) => {
                    const priorityOrder = { high: 0, medium: 1, low: 2 }
                    return priorityOrder[a.priority] - priorityOrder[b.priority]
                  }).map((gap, index) => (
                    <div
                      key={index}
                      className={`p-4 border-2 rounded-lg ${getPriorityColor(gap.priority)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold px-2 py-1 rounded bg-white bg-opacity-50">
                              {getPriorityBadge(gap.priority)}
                            </span>
                            <span className="text-sm text-gray-600">
                              {new Date(gap.date).toLocaleDateString('fi-FI', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short'
                              })}
                            </span>
                          </div>
                          <p className="font-medium">{gap.description}</p>
                          {gap.type === 'missing-weekly-program' && (
                            <p className="text-sm mt-1 opacity-75">
                              💡 Julkaise viikko-ohjelma maanantai-aamuna
                            </p>
                          )}
                          {gap.type === 'missing-last-minute' && (
                            <p className="text-sm mt-1 opacity-75">
                              💡 Last minute -markkinointi 1-2 päivää ennen tapahtumaa
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI-ehdotukset */}
            {aiSuggestions.length > 0 && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-sm p-6 border-2 border-purple-200">
                <h3 className="text-xl font-semibold mb-4">✨ AI:n ehdotukset sisällöksi</h3>
                <div className="space-y-3">
                  {aiSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="bg-white p-4 rounded-lg shadow-sm border border-purple-200"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${getPriorityColor(suggestion.priority)}`}>
                            {getPriorityBadge(suggestion.priority)}
                          </span>
                          <span className="text-sm font-medium text-gray-700">
                            {new Date(suggestion.date).toLocaleDateString('fi-FI', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long'
                            })}
                          </span>
                        </div>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                          {suggestion.channel}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{suggestion.title || suggestion.type}</h4>
                      <p className="text-sm text-gray-600 mb-3">{suggestion.reason}</p>

                      {/* AI-generoidut caption-versiot */}
                      {(suggestion.captions || generatedCaptions[index]) && (() => {
                        const captions = suggestion.captions || generatedCaptions[index];
                        return (
                        <div className="mb-3 bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-200">
                          <button
                            onClick={() => toggleSuggestionExpansion(suggestion)}
                            className="w-full text-left font-medium text-purple-900 flex items-center justify-between mb-2"
                          >
                            <span>✨ AI:n caption-ehdotukset</span>
                            <span>{expandedSuggestion === suggestion ? '▼' : '▶'}</span>
                          </button>

                          {expandedSuggestion === suggestion && (
                            <div className="space-y-3 mt-3">
                              {/* Lyhyt versio */}
                              <div
                                className="bg-white p-3 rounded border-2 border-gray-200 hover:border-purple-400 cursor-pointer transition"
                                onClick={() => setEditableCaption(captions.short)}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-gray-600">📝 LYHYT (klikkaa kopioidaksesi)</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      saveAICaption(suggestion, 'short', index);
                                    }}
                                    disabled={savingSuggestion === suggestion}
                                    className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded font-medium"
                                  >
                                    💾 Tallenna
                                  </button>
                                </div>
                                <p className="text-sm text-gray-700">{captions.short}</p>
                              </div>

                              {/* Keskipitkä versio */}
                              <div
                                className="bg-white p-3 rounded border-2 border-gray-200 hover:border-purple-400 cursor-pointer transition"
                                onClick={() => setEditableCaption(captions.medium)}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-gray-600">📄 KESKIPITKÄ (klikkaa kopioidaksesi)</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      saveAICaption(suggestion, 'medium', index);
                                    }}
                                    disabled={savingSuggestion === suggestion}
                                    className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded font-medium"
                                  >
                                    💾 Tallenna
                                  </button>
                                </div>
                                <p className="text-sm text-gray-700">{captions.medium}</p>
                              </div>

                              {/* Pitkä versio */}
                              <div
                                className="bg-white p-3 rounded border-2 border-gray-200 hover:border-purple-400 cursor-pointer transition"
                                onClick={() => setEditableCaption(captions.long)}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-gray-600">📜 PITKÄ (klikkaa kopioidaksesi)</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      saveAICaption(suggestion, 'long', index);
                                    }}
                                    disabled={savingSuggestion === suggestion}
                                    className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded font-medium"
                                  >
                                    💾 Tallenna
                                  </button>
                                </div>
                                <p className="text-sm text-gray-700">{captions.long}</p>
                              </div>

                              {/* Muokattava versio */}
                              <div className="bg-white p-3 rounded border-2 border-indigo-200">
                                <label className="block text-xs font-bold text-indigo-900 mb-2">
                                  ✏️ MUOKKAA JA TALLENNA
                                </label>
                                <textarea
                                  value={editableCaption}
                                  onChange={(e) => setEditableCaption(e.target.value)}
                                  className="w-full p-2 border border-gray-300 rounded text-sm mb-2"
                                  rows="4"
                                />
                                <button
                                  onClick={() => addSuggestionToCalendar(suggestion, editableCaption)}
                                  disabled={savingSuggestion === suggestion}
                                  className={`w-full py-2 px-4 rounded font-semibold transition ${
                                    savingSuggestion === suggestion
                                      ? 'bg-gray-400 text-white cursor-not-allowed'
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                  }`}
                                >
                                  {savingSuggestion === suggestion ? '💾 Tallennetaan...' : '💾 Tallenna muokattu'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        );
                      })()}

                      {/* "Lisää somepäivitys" -nappi - avaa lomakkeen esitäytetyllä datalla */}
                      <button
                        onClick={() => openAddPostModal(suggestion)}
                        className="w-full py-2 px-4 rounded-lg font-semibold transition bg-green-600 hover:bg-green-700 text-white mt-3"
                      >
                        ➕ Lisää somepäivitys
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nopeat toiminnot */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">⚡ Nopeat toiminnot</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Link href="/mallit">
                  <button className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition">
                    📝 Luo mallista
                  </button>
                </Link>
                <Link href="/uutiskirje">
                  <button className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition">
                    📧 Luo uutiskirje
                  </button>
                </Link>
                <Link href="/">
                  <button className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition">
                    ➕ Lisää tapahtuma
                  </button>
                </Link>
              </div>
            </div>
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
