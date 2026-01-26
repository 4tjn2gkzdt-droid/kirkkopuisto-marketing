import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function Brainstorming() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: '💡 Tervetuloa ideointiin! Olen luova assistenttisi markkinointi-ideoiden kehittämiseen.\n\nMinulla on pääsy:\n✅ Aikaisempien vuosien uutisiin ja uutiskirjeisiin\n✅ Historiallisiin tapahtumiin\n✅ Brändidokumentteihin\n\nKerro mitä ideoit, niin lähdetään yhdessä liikkeelle! Voin analysoida mikä sisältö on toiminut parhaiten ja luoda uusia ideoita sen pohjalta.'
  }])
  const [inputMessage, setInputMessage] = useState('')
  const [sessionId, setSessionId] = useState(null)
  const [sessionTitle, setSessionTitle] = useState('Uusi brainstorming-sessio')

  // Sidebar state
  const [showSidebar, setShowSidebar] = useState(true)
  const [savedIdeas, setSavedIdeas] = useState([])
  const [sessions, setSessions] = useState([])
  const [activeTab, setActiveTab] = useState('ideas') // 'ideas' tai 'sessions'

  // Idea tallennuslomake
  const [showSaveIdeaForm, setShowSaveIdeaForm] = useState(false)
  const [ideaToSave, setIdeaToSave] = useState('')
  const [ideaTitle, setIdeaTitle] = useState('')
  const [ideaTags, setIdeaTags] = useState('')
  const [ideaCategory, setIdeaCategory] = useState('draft')

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (user) {
      loadSavedIdeas()
      loadSessions()
    }
  }, [user])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)
    setLoading(false)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadSavedIdeas = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/brainstorm/save-idea', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.ideas) {
        setSavedIdeas(data.ideas)
      }
    } catch (error) {
      console.error('Error loading ideas:', error)
    }
  }

  const loadSessions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/brainstorm/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.sessions) {
        setSessions(data.sessions)
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  const handleSend = async () => {
    if (!inputMessage.trim() || sending) return

    const userMessage = inputMessage.trim()
    setInputMessage('')

    // Lisää käyttäjän viesti
    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)

    setSending(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/brainstorm-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: newMessages,
          sessionId,
          sessionTitle,
          includeHistoricalContent: true,
          includeSocialPosts: false, // Disabled - Meta Graph API not working
          includeEvents: true,
          includeBrandGuidelines: true
        })
      })

      const data = await response.json()

      if (data.response) {
        setMessages([...newMessages, { role: 'assistant', content: data.response }])

        // Tallenna session ID jos uusi
        if (!sessionId && data.sessionId) {
          setSessionId(data.sessionId)
          loadSessions() // Päivitä sessioiden lista
        }
      } else {
        alert('Virhe: ' + (data.error || 'Tuntematon virhe'))
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Virhe: ' + error.message)
    } finally {
      setSending(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content)
    alert('📋 Kopioitu leikepöydälle!')
  }

  const saveAsIdea = (content) => {
    setIdeaToSave(content)
    setIdeaTitle('')
    setIdeaTags('')
    setIdeaCategory('draft')
    setShowSaveIdeaForm(true)
  }

  const submitSaveIdea = async () => {
    if (!ideaTitle.trim() || !ideaToSave.trim()) {
      alert('Anna idealle otsikko')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const response = await fetch('/api/brainstorm/save-idea', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId,
          title: ideaTitle,
          content: ideaToSave,
          tags: ideaTags.split(',').map(t => t.trim()).filter(t => t),
          category: ideaCategory,
          status: 'draft'
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('💡 Idea tallennettu!')
        setShowSaveIdeaForm(false)
        loadSavedIdeas()
      } else {
        alert('Virhe: ' + (data.error || 'Tallennus epäonnistui'))
      }
    } catch (error) {
      console.error('Error saving idea:', error)
      alert('Virhe: ' + error.message)
    }
  }

  const newSession = () => {
    if (messages.length > 1) {
      if (!confirm('Haluatko aloittaa uuden session? Nykyinen keskustelu tyhjennetään.')) {
        return
      }
    }

    setSessionId(null)
    setSessionTitle('Uusi brainstorming-sessio')
    setMessages([{
      role: 'assistant',
      content: '💡 Uusi sessio aloitettu! Mitä ideoidaan tänään?'
    }])
  }

  const loadSession = async (session) => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const token = authSession?.access_token

      const response = await fetch(`/api/brainstorm/sessions?sessionId=${session.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (data.messages) {
        setSessionId(session.id)
        setSessionTitle(session.title)
        setMessages(data.messages.length > 0 ? data.messages : [{
          role: 'assistant',
          content: '💡 Sessio ladattu! Jatketaan ideointia.'
        }])
      }
    } catch (error) {
      console.error('Error loading session:', error)
      alert('Virhe: ' + error.message)
    }
  }

  // Esimerkki-promptit
  const examplePrompts = [
    "Tarvitsemme ideoita kesän 2026 markkinointikampanjaan",
    "Miten voisimme markkinoida jazz-iltoja eri tavalla?",
    "Millaisia teemailloja voisimme järjestää?",
    "Anna ideoita sosiaalisen median sisältöön kesälle"
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Ladataan...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-green-600 hover:text-green-700">
                ← Takaisin
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                💡 Ideointi & Brainstorming
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-lg hover:bg-gray-100"
              >
                {showSidebar ? '◀ Piilota' : '▶ Näytä'} sivupalkki
              </button>
              <button
                onClick={newSession}
                className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                ➕ Uusi sessio
              </button>
              <div className="text-sm text-gray-600">
                {user?.email}
              </div>
            </div>
          </div>
          {sessionTitle && (
            <div className="mt-2 text-sm text-gray-600">
              📂 {sessionTitle}
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Chat area */}
        <div className={`flex-1 overflow-hidden flex flex-col px-4 sm:px-6 lg:px-8 py-6 transition-all ${showSidebar ? 'mr-80' : ''}`}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {/* Ohjeet */}
            {messages.length <= 1 && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-4">
                <h3 className="font-semibold text-blue-900 mb-3">✨ Ideointi AI:n avulla</h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>• AI hyödyntää <strong>aikaisempien vuosien tapahtumia ja sisältöä</strong></p>
                  <p>• Saat <strong>luovia, datapohjaisia ehdotuksia</strong></p>
                  <p>• Voit <strong>tallentaa hyviä ideoita</strong> ideavarastoon</p>
                  <p>• Keskustelut tallentuvat sessioihin</p>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Kokeile näitä:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {examplePrompts.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => setInputMessage(prompt)}
                        className="text-left text-sm bg-white text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 transition"
                      >
                        💡 {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Viestit */}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-green-600 text-white'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {msg.role === 'assistant' && index > 0 && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => copyToClipboard(msg.content)}
                          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                        >
                          📋 Kopioi
                        </button>
                        <button
                          onClick={() => saveAsIdea(msg.content)}
                          className="text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded hover:bg-green-50"
                        >
                          💡 Tallenna ideana
                        </button>
                      </div>
                    )}
                  </div>
                  <div className={`text-xs text-gray-500 mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.role === 'user' ? 'Sinä' : 'AI'}
                  </div>
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-end gap-2 p-3">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Kerro mitä ideoit... (Enter lähettää, Shift+Enter uusi rivi)"
                className="flex-1 px-4 py-2 border-0 focus:ring-0 resize-none"
                rows={2}
                disabled={sending}
              />
              <button
                onClick={handleSend}
                disabled={!inputMessage.trim() || sending}
                className={`px-6 py-2 rounded-lg font-semibold transition ${
                  !inputMessage.trim() || sending
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {sending ? '⏳' : '📤'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto flex-shrink-0">
            <div className="p-4">
              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveTab('ideas')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold ${
                    activeTab === 'ideas'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  💡 Ideat ({savedIdeas.length})
                </button>
                <button
                  onClick={() => setActiveTab('sessions')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold ${
                    activeTab === 'sessions'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📂 Sessiot ({sessions.length})
                </button>
              </div>

              {/* Ideas Tab */}
              {activeTab === 'ideas' && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-700 mb-2">Tallennetut ideat</h3>
                  {savedIdeas.length === 0 ? (
                    <p className="text-sm text-gray-500">Ei tallennettuja ideoita</p>
                  ) : (
                    savedIdeas.map((idea) => (
                      <div key={idea.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <h4 className="font-semibold text-sm text-gray-900 mb-1">
                          {idea.title}
                        </h4>
                        <p className="text-xs text-gray-600 line-clamp-3 mb-2">
                          {idea.content}
                        </p>
                        {idea.tags && idea.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {idea.tags.map((tag, i) => (
                              <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(idea.content)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            📋 Kopioi
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Sessions Tab */}
              {activeTab === 'sessions' && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-700 mb-2">Brainstorming-sessiot</h3>
                  {sessions.length === 0 ? (
                    <p className="text-sm text-gray-500">Ei tallennettuja sessioita</p>
                  ) : (
                    sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`border rounded-lg p-3 cursor-pointer hover:bg-gray-50 ${
                          sessionId === session.id ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'
                        }`}
                        onClick={() => loadSession(session)}
                      >
                        <h4 className="font-semibold text-sm text-gray-900 mb-1">
                          {session.title}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {new Date(session.created_at).toLocaleDateString('fi-FI')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Idea Modal */}
      {showSaveIdeaForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-bold mb-4">💡 Tallenna idea</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Otsikko *</label>
                <input
                  type="text"
                  value={ideaTitle}
                  onChange={(e) => setIdeaTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Anna idealle lyhyt otsikko"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Sisältö</label>
                <textarea
                  value={ideaToSave}
                  onChange={(e) => setIdeaToSave(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={6}
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Tagit (pilkulla erotettuna)</label>
                <input
                  type="text"
                  value={ideaTags}
                  onChange={(e) => setIdeaTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="kesä, markkinointi, jazz"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Kategoria</label>
                <select
                  value={ideaCategory}
                  onChange={(e) => setIdeaCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="draft">Luonnos</option>
                  <option value="kesämarkkinointi">Kesämarkkinointi</option>
                  <option value="tapahtuma-idea">Tapahtuma-idea</option>
                  <option value="somepostaus">Somepostaus</option>
                  <option value="kampanja">Kampanja</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={submitSaveIdea}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
              >
                💾 Tallenna
              </button>
              <button
                onClick={() => setShowSaveIdeaForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-semibold"
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
