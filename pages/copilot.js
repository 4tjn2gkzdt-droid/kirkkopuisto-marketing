import React, { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function ContentCopilot() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: '👋 Hei! Olen sisältöassistentisi. Kerro mitä sisältöä tarvitset, niin autan sinua luomaan sen. Kysyn tarkentavia kysymyksiä, jotta sisältö olisi juuri sopiva!'
  }])
  const [inputMessage, setInputMessage] = useState('')
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    checkUser()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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

  const handleSend = async () => {
    if (!inputMessage.trim() || sending) return

    const userMessage = inputMessage.trim()
    setInputMessage('')

    // Lisää käyttäjän viesti
    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)

    setSending(true)

    try {
      const response = await fetch('/api/content-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          sessionId
        })
      })

      const data = await response.json()

      if (data.success) {
        setMessages([...newMessages, { role: 'assistant', content: data.message }])
      } else {
        toast.error('Virhe: ' + (data.error || 'Tuntematon virhe'))
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Virhe: ' + error.message)
    } finally {
      setSending(false)
      // Focus takaisin input-kenttään
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
    toast.success('📋 Kopioitu leikepöydälle!')
  }

  const clearConversation = () => {
    if (confirm('Haluatko varmasti tyhjentää keskustelun?')) {
      setMessages([{
        role: 'assistant',
        content: '👋 Hei! Olen sisältöassistentisi. Kerro mitä sisältöä tarvitset, niin autan sinua luomaan sen!'
      }])
    }
  }

  // Esimerkki-promptit
  const examplePrompts = [
    "Tarvitsen Instagram-postauksen viikonlopun tapahtumasta",
    "Haluan luoda kiitos-postauksen eilisestä konsertista",
    "Miten markkinoisin viime hetken lippuja?",
    "Tarvitsen viikko-ohjelman maanantaiksi"
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
                🤖 Interaktiivinen assistentti (Co-Pilot)
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={clearConversation}
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-lg hover:bg-gray-100"
              >
                🗑️ Tyhjennä
              </button>
              <div className="text-sm text-gray-600">
                {user?.email}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          {/* Ohjeet (näytetään vain alussa) */}
          {messages.length <= 1 && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6 mb-4">
              <h3 className="font-semibold text-purple-900 mb-3">✨ Miten Co-Pilot toimii?</h3>
              <div className="text-sm text-purple-800 space-y-2">
                <p>• Co-Pilot <strong>kysyy tarkentavia kysymyksiä</strong> ennen sisällön luomista</p>
                <p>• Anna kontekstia: tapahtuma, artisti, tunnelma, kanava</p>
                <p>• Keskustele vapaasti - AI ymmärtää ja oppii</p>
                <p>• Luo vasta lopullinen sisältö kun kaikki on selvää</p>
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold text-purple-900 mb-2">Kokeile näitä:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {examplePrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setInputMessage(prompt)}
                      className="text-left text-sm bg-white text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-100 transition"
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
                    <button
                      onClick={() => copyToClipboard(msg.content)}
                      className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                    >
                      📋 Kopioi
                    </button>
                  )}
                </div>
                <div className={`text-xs text-gray-500 mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.role === 'user' ? 'Sinä' : 'Co-Pilot'}
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
              placeholder="Kirjoita viesti... (Enter lähettää, Shift+Enter uusi rivi)"
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
    </div>
  )
}
