import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

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

  useEffect(() => {
    checkUser()
    // Aseta oletusaikavä li: tästä päivästä 30 päivää eteenpäin
    const today = new Date()
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    setStartDate(today.toISOString().split('T')[0])
    setEndDate(in30Days.toISOString().split('T')[0])
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
      } else {
        alert('Virhe analyysissä: ' + (data.error || 'Tuntematon virhe'))
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

  const addSuggestionToCalendar = async (suggestion) => {
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

      // Luo uusi somepostaus
      const { data, error } = await supabase
        .from('social_media_posts')
        .insert({
          title: suggestion.type,
          date: suggestion.date,
          type: suggestion.type.toLowerCase().replace(/\s+/g, '-'),
          channels: [channel],
          status: 'suunniteltu',
          caption: suggestion.reason,
          notes: 'Luotu AI-ehdotuksesta',
          user_id: user.id
        })
        .select()

      if (error) throw error

      alert('✅ Ehdotus lisätty kalenteriin!')

      // Päivitä listaus poistamalla lisätty ehdotus
      setAiSuggestions(prev => prev.filter((_, i) => _ !== suggestion))

    } catch (error) {
      console.error('Error saving suggestion:', error)
      alert('Virhe tallennuksessa: ' + error.message)
    } finally {
      setSavingSuggestion(null)
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
                      <h4 className="font-semibold text-gray-900 mb-1">{suggestion.type}</h4>
                      <p className="text-sm text-gray-600 mb-3">{suggestion.reason}</p>
                      <button
                        onClick={() => addSuggestionToCalendar(suggestion)}
                        disabled={savingSuggestion === suggestion}
                        className={`w-full py-2 px-4 rounded-lg font-semibold transition ${
                          savingSuggestion === suggestion
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                      >
                        {savingSuggestion === suggestion ? '💾 Tallennetaan...' : '➕ Lisää kalenteriin'}
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
    </div>
  )
}
